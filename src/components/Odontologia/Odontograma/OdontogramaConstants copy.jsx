// components/Odontologia/Odontograma/OdontogramaConstants.js
import { CONDITION_MAP } from './index';

// ============================================================
// CONSTANTES
// ============================================================
export const PHASES = [
  { id: 'inicial', label: 'Odontograma Inicial', editable: true, hasPlan: false },
  { id: 'evolucion', label: 'Evolución Clínica', editable: true, hasPlan: true },
  { id: 'alta', label: 'Alta Odontológica', editable: false, hasPlan: false },
];

// ============================================================
// ✅ CONDICIONES FAVORABLES (NO requieren tratamiento)
// ============================================================
export const CONDICIONES_FAVORABLES = [
  'diente_sano',
  'resina_adaptada',
  'amalgama_adaptada',
  'sellante_bueno',
  'corona_buena',
  'endodoncia_buena',
  'perno_bueno',
  'implante_bueno',
  'pontico'
];

// ============================================================
// ✅ CONDICIONES NO FAVORABLES (REQUIEREN tratamiento)
// TODOS los hallazgos que deben aparecer en el plan de tratamiento
// ============================================================
export const CONDICIONES_NO_FAVORABLES = [
  'caries',
  'resina_desadaptada',
  'amalgama_desadaptada',
  'sellante_desadaptado',
  'corona_desadaptada',
  'fractura',
  'provisional',
  'extraccion_indicada',
  'endodoncia_mala',
  'perno_malo',
  'implante_malo',
  'diente_ausente',      // ✅ INCLUIDO
  'otro'
];

// ============================================================
// ✅ HALLAZGOS QUE REQUIEREN SUPERFICIE (específicos de una cara)
// ============================================================
export const HALLAZGOS_CON_SUPERFICIE = [
  'caries',
  'resina_desadaptada',
  'amalgama_desadaptada',
  'sellante_desadaptado',
  'corona_desadaptada',
  'fractura',
];

// ============================================================
// ✅ HALLAZGOS GLOBALES (afectan a todo el diente)
// ============================================================
export const HALLAZGOS_GLOBALES = [
  'extraccion_indicada',
  'endodoncia_mala',
  'perno_malo',
  'implante_malo',
  'diente_ausente',      // ✅ INCLUIDO
  'otro',
];

// ============================================================
// ESTADOS DE TRATAMIENTO
// ============================================================
export const ESTADOS_TRATAMIENTO = [
  { value: 'pendiente', label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'en_proceso', label: 'En proceso', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'completado', label: 'Completado', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { value: 'cancelado', label: 'Cancelado', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
];

export const DEFAULT_PHASE = {
  teeth: {},
  planTratamiento: [],
  notas: '',
  lastSavedAt: null,
  planId: null,
};

// ============================================================
// UTILIDADES
// ============================================================
export const clonePhase = (phase) => {
  const safePhase = phase || {};
  return {
    ...DEFAULT_PHASE,
    ...safePhase,
    teeth: { ...(safePhase.teeth || {}) },
    planTratamiento: Array.isArray(safePhase.planTratamiento) ? [...safePhase.planTratamiento] : [],
  };
};

export const getConditionLabel = (condition, surfaces = []) => {
  const info = CONDITION_MAP[condition];
  const surfacesText = surfaces.length > 0 ? ` (${surfaces.join(', ')})` : '';
  return `${info?.label || condition || 'Sin hallazgo'}${surfacesText}`;
};

export const generarId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================================
// ✅ FUNCIONES DE VERIFICACIÓN (UNIFICADAS)
// ============================================================

// ✅ Verifica si una condición es favorable
export const esCondicionFavorable = (condition) => {
  if (!condition) return false;
  return CONDICIONES_FAVORABLES.includes(condition);
};

// ✅ Verifica si una condición NO es favorable (requiere tratamiento)
export const esCondicionNoFavorable = (condition) => {
  if (!condition) return false;
  return CONDICIONES_NO_FAVORABLES.includes(condition);
};

// ✅ Verifica si es un hallazgo global
export const esHallazgoGlobal = (condition) => {
  if (!condition) return false;
  return HALLAZGOS_GLOBALES.includes(condition);
};

// ✅ Verifica si es un hallazgo superficial
export const esHallazgoSuperficial = (condition) => {
  if (!condition) return false;
  return HALLAZGOS_CON_SUPERFICIE.includes(condition);
};

// ============================================================
// ✅ OBTENER HALLAZGOS NO FAVORABLES
// ============================================================
export const obtenerHallazgosNoFavorables = (teeth) => {
  const resultados = [];
  
  if (!teeth) return resultados;
  
  Object.keys(teeth).forEach(toothKey => {
    const tooth = teeth[toothKey];
    if (!tooth) return;
    
    const caras = tooth.caras || {};
    const condition = tooth.condition || '';
    
    // 1️⃣ Hallazgos por superficie (específicos de cada cara)
    Object.entries(caras).forEach(([surface, cond]) => {
      if (cond && esCondicionNoFavorable(cond) && esHallazgoSuperficial(cond)) {
        resultados.push({
          tooth: parseInt(toothKey),
          surface,
          condition: cond,
          label: getConditionLabel(cond, [surface]),
          tipo: 'superficial',
          surfaces: [surface],
        });
      }
    });
    
    // 2️⃣ Hallazgos globales (del diente completo)
    if (condition && esCondicionNoFavorable(condition) && esHallazgoGlobal(condition)) {
      resultados.push({
        tooth: parseInt(toothKey),
        surface: 'global',
        condition: condition,
        label: getConditionLabel(condition, []),
        tipo: 'global',
        surfaces: [],
      });
    }
  });
  
  return resultados;
};

// ✅ Verificar si un diente tiene hallazgos NO favorables
export const tieneHallazgosNoFavorables = (tooth) => {
  if (!tooth) return false;
  
  const caras = tooth.caras || {};
  const condition = tooth.condition || '';
  
  // Verificar hallazgos por superficie
  const tieneSuperficial = Object.values(caras).some(cond => 
    cond && esCondicionNoFavorable(cond) && esHallazgoSuperficial(cond)
  );
  
  // Verificar hallazgos globales
  const tieneGlobal = condition && esCondicionNoFavorable(condition) && esHallazgoGlobal(condition);
  
  return tieneSuperficial || tieneGlobal;
};

// ✅ Obtener superficies afectadas de un diente
export const obtenerSuperficiesAfectadas = (tooth) => {
  if (!tooth) return [];
  const caras = tooth.caras || {};
  return Object.keys(caras).filter(surface => {
    const cond = caras[surface];
    return cond && esCondicionNoFavorable(cond) && esHallazgoSuperficial(cond);
  });
};