// src/components/Odontologia/Odontograma.jsx
import React, { useState } from 'react';
import Diente from './Diente';
import ModalHallazgo from './ModalHallazgo';
import odontogramaImg from '../../../assets/Odontologia/odontograma.png';

import cariesIcon from '../../../assets/icons/caries.svg';
import r_adap_sIcon from '../../../assets/icons/r_adap_s.svg';
import r_adap_iIcon from '../../../assets/icons/r_adap_i.svg';
import r_des_sIcon from '../../../assets/icons/r_des_s.svg';
import r_des_iIcon from '../../../assets/icons/r_des_i.svg';
import a_adap_sIcon from '../../../assets/icons/a_ad_s.svg';
import a_adap_iIcon from '../../../assets/icons/a_ad_i.svg';
import a_des_sIcon from '../../../assets/icons/a_des_s.svg';
import a_des_iIcon from '../../../assets/icons/a_des_i.svg';
import d_sanoIcon from '../../../assets/icons/d_sano.svg';
import d_auIcon from '../../../assets/icons/d_au.svg';
import s_buenIcon from '../../../assets/icons/s_buen.svg';
import s_desIcon from '../../../assets/icons/s_des.svg';
import fracturaIcon from '../../../assets/icons/fractura.svg';
import c_buen_sIcon from '../../../assets/icons/c_bue_s.svg';
import c_buen_iIcon from '../../../assets/icons/c_bue_s.svg';
import c_des_sIcon from '../../../assets/icons/cdes_s.svg';
import c_des_iIcon from '../../../assets/icons/cdes_i.svg';
import prov_sIcon from '../../../assets/icons/prov_s.svg';
import prov_iIcon from '../../../assets/icons/prov_i.svg';
import e_indIcon from '../../../assets/icons/e_ind.svg';
import e_b_sIcon from '../../../assets/icons/e_b_s.png';
import e_b_iIcon from '../../../assets/icons/e_b_i.png';
import e_m_sIcon from '../../../assets/icons/e_m_s.png';
import e_m_iIcon from '../../../assets/icons/e_m_i.png';
import perno_b_sIcon from '../../../assets/icons/per_b_s.png';
import perno_b_iIcon from '../../../assets/icons/per_b_i.png';
import perno_m_sIcon from '../../../assets/icons/per_m_s.png';
import perno_m_iIcon from '../../../assets/icons/per_m_i.png';
import i_b_sIcon from '../../../assets/icons/i_b_s.png';
import i_b_iIcon from '../../../assets/icons/i_b_i.png';
import i_m_sIcon from '../../../assets/icons/i_m_s.png';
import i_m_iIcon from '../../../assets/icons/i_m_i.png';
import p_sIcon from '../../../assets/icons/p_s.png';
import pIcon from '../../../assets/icons/pont.png';
import otrosIcon from '../../../assets/icons/otros.svg';
import '../../../styles/Odontologia/Odontograma.css';

// ============================================================
// MAPEO DE CONDICIONES (exportado)
// ============================================================
export const CONDITION_MAP = {
  caries: { label: 'Caries', icon: cariesIcon, color: '#ef4444' },
  resina_adaptada: { label: 'Resina adaptada', icon: r_adap_sIcon, color: '#10b981' },
  resina_desadaptada: { label: 'Resina desadaptada', icon: r_des_sIcon, color: '#ef4444' },
  amalgama_adaptada: { label: 'Amalgama adaptada', icon: a_adap_sIcon, color: '#10b981' },
  amalgama_desadaptada: { label: 'Amalgama desadaptada', icon: a_des_sIcon, color: '#ef4444' },
  diente_sano: { label: 'Diente sano', icon: d_sanoIcon, color: '#4ade80' },
  diente_ausente: { label: 'Diente ausente', icon: d_auIcon, color: '#ef4444' },
  sellante_bueno: { label: 'Sellante bueno', icon: s_buenIcon, color: '#4ade80' },
  sellante_desadaptado: { label: 'Sellante desadaptado', icon: s_desIcon, color: '#ef4444' },
  fractura: { label: 'Fractura', icon: fracturaIcon, color: '#ef4444' },
  corona_buena: { label: 'Corona buena', icon: c_buen_sIcon, color: '#10b981' },
  corona_desadaptada: { label: 'Corona desadaptada', icon: c_des_sIcon, color: '#ef4444' },
  provisional: { label: 'Provisional', icon: prov_sIcon, color: '#10b981' },
  extraccion_indicada: { label: 'Extracción indicada', icon: e_indIcon, color: '#ef4444' },
  endodoncia_buena: { label: 'Endodoncia buena', icon: e_b_sIcon, color: '#10b981' },
  endodoncia_mala: { label: 'Endodoncia mala', icon: e_m_sIcon, color: '#ef4444' },
  perno_bueno: { label: 'Perno bueno', icon: perno_b_sIcon, color: '#10b981' },
  perno_malo: { label: 'Perno malo', icon: perno_m_sIcon, color: '#ef4444' },
  implante_bueno: { label: 'Implante bueno', icon: i_b_sIcon, color: '#10b981' },
  implante_malo: { label: 'Implante malo', icon: i_m_sIcon, color: '#ef4444' },
  ponico: { label: 'Póntico', icon: pIcon, color: '#10b981' },
  otro: { label: 'Otros', icon: otrosIcon, color: '#9ca3af' },
};

export const SURFACE_OPTIONS = [
  'vestibular', 'mesial', 'distal', 'lingual', 'oclusal'
];

// ============================================================
// POSICIONES EN PORCENTAJES (para la imagen de fondo)
// ============================================================
const TOOTH_POSITIONS = {
  18: { left: 0.2, top: 0.0, width: 7.00, height: 49.3 },
  17: { left: 7.28, top: 0.0, width: 7.70, height: 49.3 },
  16: { left: 14.80, top: 0.0, width: 8.10, height: 49.3 },
  15: { left: 22.80, top: 0.0, width: 5.60, height: 49.3 },
  14: { left: 28.40, top: 0.0, width: 5.72, height: 49.3 },
  13: { left: 33.90, top: 0.0, width: 5.67, height: 49.3 },
  12: { left: 39.50, top: 0.0, width: 5.40, height: 49.3 },
  11: { left: 44.70, top: 0.0, width: 5.41, height: 49.3 },
  21: { left: 50.50, top: 0.0, width: 5.31, height: 49.3 },
  22: { left: 55.88, top: 0.0, width: 5.40, height: 49.3 },
  23: { left: 61.00, top: 0.0, width: 5.67, height: 49.3 },
  24: { left: 66.65, top: 0.0, width: 5.72, height: 49.3 },
  25: { left: 72.15, top: 0.0, width: 5.60, height: 49.3 },
  26: { left: 77.60, top: 0.0, width: 8.00, height: 49.3 },
  27: { left: 85.50, top: 0.0, width: 7.70, height: 49.3 },
  28: { left: 92.90, top: 0.0, width: 7.10, height: 49.3 },
  48: { left: 0.2, top: 54.2, width: 7.00, height: 49.3 },
  47: { left: 7.30, top: 54.2, width: 7.68, height: 49.3 },
  46: { left: 15.10, top: 54.2, width: 8.00, height: 49.3 },
  45: { left: 23.15, top: 54.2, width: 5.58, height: 49.3 },
  44: { left: 28.80, top: 54.2, width: 5.82, height: 49.3 },
  43: { left: 34.50, top: 54.2, width: 5.70, height: 49.3 },
  42: { left: 40.00, top: 54.2, width: 5.50, height: 49.3 },
  41: { left: 45.30, top: 54.2, width: 4.90, height: 49.3 },
  31: { left: 50.50, top: 54.2, width: 5.61, height: 49.3 },
  32: { left: 56.00, top: 54.2, width: 5.60, height: 49.3 },
  33: { left: 61.48, top: 54.2, width: 5.47, height: 49.3 },
  34: { left: 66.95, top: 54.2, width: 5.82, height: 49.3 },
  35: { left: 72.57, top: 54.2, width: 5.58, height: 49.3 },
  36: { left: 78.00, top: 54.2, width: 7.80, height: 49.3 },
  37: { left: 85.50, top: 54.2, width: 7.80, height: 49.3 },
  38: { left: 93.20, top: 54.2, width: 7.00, height: 49.3 },
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Odontograma({
  odontogramData = {},
  onUpdateTooth,
  readOnly = false,
  selectionMode = false,
  selectedTeeth = [],
  onSelectionChange,
}) {
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleToothClick = (toothNumber) => {
    if (readOnly) return;
    if (selectionMode) {
      const exists = selectedTeeth.includes(toothNumber);
      const nextSelection = exists
        ? selectedTeeth.filter((value) => value !== toothNumber)
        : [...selectedTeeth, toothNumber];
      onSelectionChange?.(nextSelection);
      return;
    }
    setSelectedTooth(toothNumber);
    setShowModal(true);
  };

  const handleSaveTooth = (updates) => {
    if (selectedTooth && onUpdateTooth) {
      const current = odontogramData[selectedTooth] || {};
      const { condition, surfaces, observations } = updates;
      
      // Construir nuevo caras basado en las superficies seleccionadas y la condición
      let newCaras = { ...(current.caras || {}) };
      
      if (condition) {
        // Asignar la condición a las superficies seleccionadas (agregar o actualizar)
        (surfaces || []).forEach(surf => {
          newCaras[surf] = condition;
        });
        
        // 🔥 ELIMINADO: Este bloque ya NO borra las caras anteriores
        // Ahora las caras se acumulan correctamente
        // Object.keys(newCaras).forEach(key => {
        //   if (!(surfaces || []).includes(key)) {
        //     delete newCaras[key];
        //   }
        // });
        
      } else {
        // Si no hay condición, limpiar todas las caras
        newCaras = {};
      }
      
      onUpdateTooth(selectedTooth, {
        ...current,
        condition: condition || '',
        surfaces: surfaces || [],
        observations: observations || '',
        caras: newCaras,
      });
    }
    setShowModal(false);
    setSelectedTooth(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTooth(null);
  };

  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  return (
    <div className="odontograma-wrapper">
      <div className="odontograma-container">
        <img
          src={odontogramaImg}
          alt="Odontograma"
          className="odontograma-background"
        />

        {upperTeeth.map((num) => (
          <Diente
            key={num}
            toothNumber={num}
            position={TOOTH_POSITIONS[num]}
            data={odontogramData[num] || {}}
            isSelected={selectionMode ? selectedTeeth.includes(num) : selectedTooth === num}
            onToothClick={handleToothClick}
            onUpdateTooth={onUpdateTooth}
            readOnly={readOnly}
            isUpper={true}
          />
        ))}

        {lowerTeeth.map((num) => (
          <Diente
            key={num}
            toothNumber={num}
            position={TOOTH_POSITIONS[num]}
            data={odontogramData[num] || {}}
            isSelected={selectionMode ? selectedTeeth.includes(num) : selectedTooth === num}
            onToothClick={handleToothClick}
            onUpdateTooth={onUpdateTooth}
            readOnly={readOnly}
            isUpper={false}
          />
        ))}

        {showModal && selectedTooth && (
          <ModalHallazgo
            toothNumber={selectedTooth}
            currentData={odontogramData[selectedTooth] || {}}
            onSave={handleSaveTooth}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </div>
  );
}