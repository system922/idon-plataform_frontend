// components/Odontologia/Ortodoncia/OrtodonciaDiagnostico.jsx
import React from 'react';
import { FiFileText, FiUser, FiSmile, FiActivity } from 'react-icons/fi';

const selectOptions = ['Seleccionar', 'Normal', 'Alterado', 'Pendiente'];

const styles = {
  section: {
    padding: '0',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '20px 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitleFirst: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
    paddingBottom: '8px',
    borderBottom: '2px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
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
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  select: {
    padding: '8px 32px 8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    appearance: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
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
    boxSizing: 'border-box',
  },
  subSection: {
    marginTop: '8px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  subSectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

export default function OrtodonciaDiagnostico({ form, handleNestedChange }) {
  const d = form.diagnostico || {};

  const selectField = (name, label, options = selectOptions) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.select}
        value={d[name] || ''}
        onChange={(e) => handleNestedChange('diagnostico', name, e.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );

  const inputField = (name, label, type = 'text') => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={d[name] || ''}
        onChange={(e) => handleNestedChange('diagnostico', name, e.target.value)}
      />
    </div>
  );

  const textareaField = (name, label, rows = 2) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <textarea
        style={styles.textarea}
        value={d[name] || ''}
        onChange={(e) => handleNestedChange('diagnostico', name, e.target.value)}
        rows={rows}
      />
    </div>
  );

  return (
    <div style={styles.section}>
      {/* Motivo e Historias */}
      <div style={styles.sectionTitleFirst}>
        <FiFileText size={18} color="#6366f1" />
        Motivo de consulta e Historias
      </div>
      <div style={styles.grid2}>
        {textareaField('motivo_consulta', 'Motivo de consulta', 2)}
        {textareaField('historia_medica', 'Historia médica', 2)}
        {textareaField('historia_odontologica', 'Historia odontológica', 2)}
        {textareaField('historia_familiar', 'Historia familiar', 2)}
      </div>

      {/* Examen Extraoral */}
      <div style={styles.sectionTitle}>
        <FiUser size={18} color="#6366f1" />
        Examen Extraoral
      </div>
      <div style={styles.grid3}>
        {selectField('craneo', 'Cráneo')}
        {selectField('cara', 'Cara')}
        {selectField('musculatura', 'Musculatura')}
        {selectField('atm', 'ATM')}
        {selectField('menton', 'Mentón')}
        {selectField('anl', 'ANL')}
        {selectField('fonacion', 'Fonación')}
        {selectField('deglucion', 'Deglución')}
        {selectField('respiracion', 'Respiración')}
        {selectField('permeabilidad_nasal', 'Permeabilidad nasal')}
        {selectField('habitos', 'Hábitos')}
        {selectField('asimetria_facial', 'Asimetría facial')}
      </div>

      {/* Planos y estructuras faciales */}
      <div style={styles.subSection}>
        <div style={styles.subSectionTitle}>
          <FiActivity size={14} color="#6366f1" />
          Planos y estructuras faciales
        </div>
        <div style={styles.grid3}>
          {selectField('plano_bipupilar', 'Plano bipupilar')}
          {selectField('tabique_nasal', 'Tabique nasal')}
          {selectField('comisura_bucales', 'Comisura bucales')}
          {inputField('filtrum', 'Filtrum')}
          {inputField('desviacion_filtrum', 'Desviación lateral del filtrum')}
          {inputField('desviacion_menton', 'Desviación lateral del mentón')}
        </div>
      </div>

      {/* Perfil */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>
          <FiSmile size={14} color="#6366f1" />
          Perfil AP y proyección sagital de maxilares
        </div>
        <div style={styles.grid3}>
          {selectField('perfil_ap', 'Perfil AP', [
            'Seleccionar', 'Convexo', 'Recto', 'Cóncavo',
          ])}
        </div>
        <div style={{ ...styles.grid3, marginTop: '8px' }}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Perfil y desarrollo vertical de maxilares</label>
            <select
              style={styles.select}
              value={d.perfil_vertical || ''}
              onChange={(e) => handleNestedChange('diagnostico', 'perfil_vertical', e.target.value)}
            >
              <option value="">Seleccionar</option>
              <option value="Normodivergente">Normodivergente</option>
              <option value="Hipodivergente">Hipodivergente</option>
              <option value="Hiperdivergente">Hiperdivergente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Labios */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>
          <FiSmile size={14} color="#6366f1" />
          Labios
        </div>
        <div style={styles.grid3}>
          {selectField('labios', 'Labios', [
            'Seleccionar', 'Competentes', 'Incompetentes',
          ])}
          {textareaField('labio_inferior', 'Labio inferior')}
          {textareaField('labio_superior', 'Labio superior')}
          {textareaField('sonrisa', 'Sonrisa')}
        </div>
      </div>

      {/* Examen Intraoral */}
      <div style={styles.sectionTitle}>
        <FiActivity size={18} color="#6366f1" />
        Examen Intraoral
      </div>

      {/* Tejidos blandos */}
      <div style={styles.subSection}>
        <div style={styles.subSectionTitle}>Tejidos blandos y mucosas</div>
        <div style={styles.grid3}>
          {textareaField('mucosa_labio', 'Mucosa de labio')}
          {textareaField('mucosa_vestibular', 'Mucosa vestibular')}
          {textareaField('frenillos_vestibulares', 'Frenillos vestibulares')}
          {textareaField('mucosa_palatina', 'Mucosa palatina')}
          {textareaField('mucosa_orofaringea', 'Mucosa orofaríngea')}
          {textareaField('amigdalas', 'Amígdalas')}
          {textareaField('lengua', 'Lengua')}
          {textareaField('gingiva_incisivos_inferiores', 'Gíngiva de incisivos inferiores')}
          {textareaField('gingiva_general', 'Evaluación general de la gíngiva')}
        </div>
      </div>

      {/* Arcos dentales */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Arcos dentales</div>
        <div style={styles.grid2}>
          {textareaField('arco_superior', 'Arco superior')}
          {textareaField('arco_inferior', 'Arco inferior')}
        </div>
      </div>

      {/* Errores y alteraciones */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Errores y alteraciones</div>
        <div style={styles.grid3}>
          {textareaField('error_molar_derecho', 'Error molar derecho')}
          {textareaField('error_molar_izquierdo', 'Error molar izquierdo')}
          {textareaField('dientes_ausentes', 'Dientes ausentes')}
          {textareaField('alteraciones_dientes', 'Alteraciones de número, forma y tamaño de dientes')}
        </div>
      </div>

      {/* Relaciones oclusales */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Relaciones oclusales</div>
        <div style={styles.grid3}>
          {selectField('relacion_molar_derecha', 'Relación molar derecha')}
          {selectField('relacion_molar_izquierda', 'Relación molar izquierda')}
          {selectField('relacion_canina_derecha', 'Relación canina derecha')}
          {selectField('relacion_canina_izquierda', 'Relación canina izquierda')}
        </div>
      </div>

      {/* Mordidas y resaltes */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Mordidas y resaltes</div>
        <div style={styles.grid3}>
          {textareaField('mordida_invertida', 'Mordida invertida')}
          {textareaField('resalte_horizontal', 'Resalte horizontal')}
          {textareaField('curva_spee', 'Curva de Spee')}
          {textareaField('resalte_vertical', 'Resalte vertical')}
          {textareaField('desviacion_vertical_proceso_alveolar_sup', 'Des. Vert. Proceso Alveolar Sup')}
          {textareaField('mordida_abierta_anterior', 'Mordida abierta anterior')}
          {textareaField('mordida_abierta_posterior', 'Mordida abierta posterior')}
          {textareaField('dimension_transversal_maxilar', 'Dimensión transversal maxilar')}
          {textareaField('mordida_cruzada_posterior', 'Mordida cruzada posterior')}
          {textareaField('altura_cuspide_palatina_sup', 'Altura Cusp. Palatinas Sup.')}
        </div>
      </div>

      {/* Líneas media y dientes */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Líneas media y dientes</div>
        <div style={styles.grid3}>
          {textareaField('linea_media_superior', 'Línea media superior')}
          {textareaField('linea_media_inferior', 'Línea media inferior')}
          {selectField('incisivos_superiores', 'Incisivos superiores')}
          {selectField('incisivos_inferiores', 'Incisivos inferiores')}
          {selectField('clase_ii_2', 'Patrón Clase II-2')}
        </div>
      </div>

      {/* Observaciones */}
      <div style={{ ...styles.subSection, marginTop: '12px' }}>
        <div style={styles.subSectionTitle}>Observaciones finales</div>
        <div style={styles.grid2}>
          {textareaField('observaciones', 'Observaciones', 3)}
          {textareaField('maloclusion', 'Maloclusión', 3)}
        </div>
      </div>
    </div>
  );
}