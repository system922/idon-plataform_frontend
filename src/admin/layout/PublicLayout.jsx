import React from 'react';
import Footer from '../../components/common/Footer';

export default function PublicLayout({ children, variant = 'dark' }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer variant={variant} />
    </div>
  );
}
