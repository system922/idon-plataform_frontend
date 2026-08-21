// src/components/Odontologia/Ortodoncia/OrtodonciaField.jsx
import React from 'react';
import { selectOptions } from './constants';

export const SelectField = ({ section, name, label, value, onChange, options = selectOptions }) => (
  <div className="odonto-form-group">
    <label>{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(section, name, e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

export const InputField = ({ section, name, label, value, onChange, type = 'text' }) => (
  <div className="odonto-form-group">
    <label>{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(section, name, e.target.value)}
    />
  </div>
);

export const TextareaField = ({ section, name, label, value, onChange, rows = 2 }) => (
  <div className="odonto-form-group">
    <label>{label}</label>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(section, name, e.target.value)}
      rows={rows}
    />
  </div>
);