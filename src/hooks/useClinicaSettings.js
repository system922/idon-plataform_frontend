// hooks/useClinicaSettings.js
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../config/api';

export function useClinicaSettings() {
  const [settings, setSettings] = useState({
    nombre: 'Clínica Odontológica',
    direccion: '',
    telefono: '',
    email: '',
    ruc: '',
    currencySymbol: '$',
    receiptFooter: '',
    doctores: [],  // ← Lista de odontólogos
    doctorSeleccionado: null,  // ← Odontólogo seleccionado
    loading: true,
    error: null
  });

  const loadSettings = async () => {
    setSettings(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Cargar datos de la clínica
      const [receiptRes, settingsRes, doctoresRes] = await Promise.all([
        fetchWithAuth('settings/receipt-info'),
        fetchWithAuth('settings'),
        fetchWithAuth('odontologia/especialistas?limit=1000')  // ← Cargar odontólogos
      ]);

      let receiptData = {};
      let allSettings = {};
      let doctoresData = [];

      if (receiptRes.ok) {
        receiptData = await receiptRes.json();
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        allSettings = data.data || {};
      }

      if (doctoresRes.ok) {
        const data = await doctoresRes.json();
        doctoresData = data.data || [];
      }

      // Extraer doctores de la lista de especialistas
      const doctores = doctoresData
        .filter(d => d.activo !== false)
        .map(d => ({
          id: d.id,
          nombre: d.nombre || d.name || '',
          cedula: d.cedula || d.document_number || '',
          especialidad: d.especialidad || d.specialty || 'Odontólogo',
          registro: d.registro || d.license || '',
          email: d.email || '',
          telefono: d.telefono || d.phone || ''
        }));

      // Si no hay doctores en la lista, intentar obtener del usuario actual
      let doctorSeleccionado = null;
      if (doctores.length > 0) {
        doctorSeleccionado = doctores[0];
      } else {
        // Intentar cargar desde el usuario actual
        try {
          const userRes = await fetchWithAuth('/api/users/me');
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData && userData.name) {
              doctorSeleccionado = {
                id: userData.id || 'current',
                nombre: userData.name || userData.full_name || '',
                cedula: userData.document_number || userData.cedula || '',
                especialidad: userData.specialty || userData.especialidad || 'Odontólogo',
                registro: userData.license || userData.registro || '',
                email: userData.email || '',
                telefono: userData.phone || userData.telefono || ''
              };
            }
          }
        } catch {
          // Ignorar error de usuario
        }
      }

      // Si aún no hay doctor, crear uno por defecto
      if (!doctorSeleccionado) {
        doctorSeleccionado = {
          id: 'default',
          nombre: allSettings.doctor_name || receiptData.doctor_name || 'Dr. Odontólogo',
          cedula: allSettings.doctor_cedula || receiptData.doctor_cedula || '',
          especialidad: allSettings.doctor_specialty || receiptData.doctor_specialty || 'Odontólogo',
          registro: allSettings.doctor_registro || receiptData.doctor_registro || '',
          email: receiptData.email || allSettings.email || '',
          telefono: receiptData.phone || allSettings.phone || ''
        };
      }

      setSettings({
        nombre: receiptData.company_name || receiptData.trade_name || allSettings.company_name || 'Clínica Odontológica',
        direccion: receiptData.address || allSettings.address || '',
        telefono: receiptData.phone || allSettings.phone || '',
        email: receiptData.email || allSettings.email || '',
        ruc: receiptData.ruc || allSettings.ruc || '',
        currencySymbol: receiptData.currency_symbol || allSettings.currency_symbol || '$',
        receiptFooter: receiptData.receipt_footer || allSettings.receipt_footer || '',
        doctores: doctores,
        doctorSeleccionado: doctorSeleccionado,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error cargando configuración de clínica:', error);
      setSettings(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar configuración'
      }));
    }
  };

  const seleccionarDoctor = (doctorId) => {
    const doctor = settings.doctores.find(d => d.id === doctorId);
    if (doctor) {
      setSettings(prev => ({
        ...prev,
        doctorSeleccionado: doctor
      }));
      return true;
    }
    return false;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return { 
    settings, 
    loadSettings, 
    reload: loadSettings,
    seleccionarDoctor
  };
}