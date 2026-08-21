// src/components/Odontologia/Ortodoncia/OrtodonciaTabs.jsx
import React from 'react';
import { TABS } from './constants';

export default function OrtodonciaTabs({ activeTab, setActiveTab, requiereTratamiento }) {
  const visibleTabs = requiereTratamiento ? TABS : TABS.filter(t => t.id === 'diagnostico');

  return (
    <div className="odonto-config-tabs" style={{ padding: '0 20px' }}>
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isDisabled = !requiereTratamiento && tab.id !== 'diagnostico';
        return (
          <button
            key={tab.id}
            className={`odonto-config-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={isDisabled}
            style={{
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}