// components/Odontologia/Ortodoncia/OrtodonciaTrabajo.jsx
import React, { useState, useEffect } from 'react';
import { FiTarget } from 'react-icons/fi';

export default function OrtodonciaTrabajo({ form, handleNestedChange }) {
  const t = form.trabajo || {};

  const [radiografiasChecks, setRadiografiasChecks] = useState({
    postero_anterior: false,
    periapicales_superiores: false,
    periapicales_inferiores: false,
    bitewing_molares: false,
    bitewing_molares_premolares: false,
    bitewing_premolares: false,
    carpal: false,
    oclusal_superior: false,
    oclusal_inferior: false,
    panoramica: false,
  });

  const [interconsultasChecks, setInterconsultasChecks] = useState({
    otorrinolaringologo: false,
    odontopediatra: false,
    odontologo_general: false,
    cirujano_maxilofacial: false,
    periodoncista: false,
    medica: false,
    fisioterapeuta_oral: false,
    psicologo: false,
    encerado_diagnostico: false,
    examenes_auxiliares: false,
  });

  useEffect(() => {
    if (t.radiografias_checks) {
      setRadiografiasChecks(prev => ({ ...prev, ...t.radiografias_checks }));
    }
    if (t.interconsultas_checks) {
      setInterconsultasChecks(prev => ({ ...prev, ...t.interconsultas_checks }));
    }
  }, [t.radiografias_checks, t.interconsultas_checks]);

  const handleRadiografiaChange = (name, checked) => {
    const newChecks = { ...radiografiasChecks, [name]: checked };
    setRadiografiasChecks(newChecks);
    handleNestedChange('trabajo', 'radiografias_checks', newChecks);
    const selected = Object.keys(newChecks).filter(key => newChecks[key]);
    if (selected.length > 0) {
      const labels = {
        postero_anterior: 'Postero anterior',
        periapicales_superiores: 'Periapicales de incisivos superiores',
        periapicales_inferiores: 'Periapicales de incisivos inferiores',
        bitewing_molares: 'Bitewing de molares',
        bitewing_molares_premolares: 'Bitewing de molares y premolares',
        bitewing_premolares: 'Bitewing de premolares',
        carpal: 'Carpal',
        oclusal_superior: 'Oclusal superior',
        oclusal_inferior: 'Oclusal inferior',
        panoramica: 'Panorámica',
      };
      const text = selected.map(key => labels[key]).join(', ');
      handleNestedChange('trabajo', 'radiografias', text);
    } else {
      handleNestedChange('trabajo', 'radiografias', '');
    }
  };

  const handleInterconsultaChange = (name, checked) => {
    const newChecks = { ...interconsultasChecks, [name]: checked };
    setInterconsultasChecks(newChecks);
    handleNestedChange('trabajo', 'interconsultas_checks', newChecks);
    const selected = Object.keys(newChecks).filter(key => newChecks[key]);
    if (selected.length > 0) {
      const labels = {
        otorrinolaringologo: 'Otorrinolaringólogo',
        odontopediatra: 'Odontopediatra',
        odontologo_general: 'Odontólogo General',
        cirujano_maxilofacial: 'Cirujano Máximo facial',
        periodoncista: 'Periodoncista',
        medica: 'Médica',
        fisioterapeuta_oral: 'Fisioterapeuta Oral',
        psicologo: 'Psicólogo',
        encerado_diagnostico: 'Encerado diagnóstico',
        examenes_auxiliares: 'Exámenes auxiliares',
      };
      const text = selected.map(key => labels[key]).join(', ');
      handleNestedChange('trabajo', 'interconsultas', text);
    } else {
      handleNestedChange('trabajo', 'interconsultas', '');
    }
  };

  const styles = {
    section: {
      padding: '0',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '20px',
    },
    headerTitle: {
      margin: 0,
      fontSize: '16px',
      fontWeight: 600,
      color: '#0f172a',
    },
    headerBadge: {
      fontSize: '11px',
      color: '#94a3b8',
      background: '#f1f5f9',
      padding: '2px 10px',
      borderRadius: '12px',
    },
    grid2: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '20px',
    },
    sectionGroup: {
      marginBottom: '20px',
    },
    sectionGroupTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#0f172a',
      marginBottom: '8px',
      paddingBottom: '4px',
      borderBottom: '1px solid #e2e8f0',
    },
    checkboxGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '4px 16px',
    },
    checkboxItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: '#1e293b',
      padding: '2px 0',
      cursor: 'pointer',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      accentColor: '#10b981',
      cursor: 'pointer',
      flexShrink: 0,
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    },
    label: {
      fontSize: '11px',
      fontWeight: 700,
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    textarea: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1.5px solid #e2e8f0',
      background: '#ffffff',
      color: '#1e293b',
      fontSize: '13px',
      fontFamily: 'inherit',
      resize: 'vertical',
      width: '100%',
      minHeight: '50px',
      boxSizing: 'border-box',
      transition: 'border 0.2s',
    },
  };

  const textareaField = (name, label, rows = 3, value) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <textarea
        style={styles.textarea}
        rows={rows}
        value={value || ''}
        onChange={(e) => handleNestedChange('trabajo', name, e.target.value)}
      />
    </div>
  );

  return (
    <div style={styles.section}>
      <div style={styles.grid2}>
        {/* RADIOGRAFÍAS */}
        <div style={styles.sectionGroup}>
          <div style={styles.sectionGroupTitle}>Radiografías</div>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.postero_anterior} onChange={(e) => handleRadiografiaChange('postero_anterior', e.target.checked)} />
              Postero anterior
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.periapicales_superiores} onChange={(e) => handleRadiografiaChange('periapicales_superiores', e.target.checked)} />
              Periapicales de incisivos superiores
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.periapicales_inferiores} onChange={(e) => handleRadiografiaChange('periapicales_inferiores', e.target.checked)} />
              Periapicales de incisivos inferiores
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.bitewing_molares} onChange={(e) => handleRadiografiaChange('bitewing_molares', e.target.checked)} />
              Bitewing de molares
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.bitewing_molares_premolares} onChange={(e) => handleRadiografiaChange('bitewing_molares_premolares', e.target.checked)} />
              Bitewing de molares y premolares
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.bitewing_premolares} onChange={(e) => handleRadiografiaChange('bitewing_premolares', e.target.checked)} />
              Bitewing de premolares
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.carpal} onChange={(e) => handleRadiografiaChange('carpal', e.target.checked)} />
              Carpal
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.oclusal_superior} onChange={(e) => handleRadiografiaChange('oclusal_superior', e.target.checked)} />
              Oclusal superior
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.oclusal_inferior} onChange={(e) => handleRadiografiaChange('oclusal_inferior', e.target.checked)} />
              Oclusal inferior
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={radiografiasChecks.panoramica} onChange={(e) => handleRadiografiaChange('panoramica', e.target.checked)} />
              Panorámica
            </label>
          </div>
        </div>

        {/* INTERCONSULTAS */}
        <div style={styles.sectionGroup}>
          <div style={styles.sectionGroupTitle}>Interconsultas</div>
          <div style={styles.checkboxGrid}>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.otorrinolaringologo} onChange={(e) => handleInterconsultaChange('otorrinolaringologo', e.target.checked)} />
              Otorrinolaringólogo
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.odontopediatra} onChange={(e) => handleInterconsultaChange('odontopediatra', e.target.checked)} />
              Odontopediatra
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.odontologo_general} onChange={(e) => handleInterconsultaChange('odontologo_general', e.target.checked)} />
              Odontólogo General
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.cirujano_maxilofacial} onChange={(e) => handleInterconsultaChange('cirujano_maxilofacial', e.target.checked)} />
              Cirujano Máximo facial
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.periodoncista} onChange={(e) => handleInterconsultaChange('periodoncista', e.target.checked)} />
              Periodoncista
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.medica} onChange={(e) => handleInterconsultaChange('medica', e.target.checked)} />
              Médica
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.fisioterapeuta_oral} onChange={(e) => handleInterconsultaChange('fisioterapeuta_oral', e.target.checked)} />
              Fisioterapeuta Oral
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.psicologo} onChange={(e) => handleInterconsultaChange('psicologo', e.target.checked)} />
              Psicólogo
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.encerado_diagnostico} onChange={(e) => handleInterconsultaChange('encerado_diagnostico', e.target.checked)} />
              Encerado diagnóstico
            </label>
            <label style={styles.checkboxItem}>
              <input type="checkbox" style={styles.checkbox} checked={interconsultasChecks.examenes_auxiliares} onChange={(e) => handleInterconsultaChange('examenes_auxiliares', e.target.checked)} />
              Exámenes auxiliares
            </label>
          </div>
        </div>
      </div>

      {/* INFORMES */}
      <div style={{ ...styles.grid2, marginTop: '16px' }}>
        <div style={styles.sectionGroup}>
          <div style={styles.sectionGroupTitle}>Informes</div>
          {textareaField('informes', '', 3, t.informes)}
        </div>
        <div style={styles.sectionGroup}>
          <div style={styles.sectionGroupTitle}>Diagnóstico definitivo</div>
          {textareaField('diagnostico_definitivo', '', 3, t.diagnostico_definitivo)}
        </div>
      </div>

      {/* OBJETIVO */}
      <div style={{ ...styles.grid2, marginTop: '16px' }}>
        <div style={styles.sectionGroup}>
          <div style={styles.sectionGroupTitle}>Objetivo del tratamiento</div>
          {textareaField('objetivo', '', 4, t.objetivo)}
        </div>
      </div>
    </div>
  );
}