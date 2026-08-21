import React from 'react';
import Input from '../Input';
import { DAYS } from '../DiscountHelpers';
import { ButtonGroup, IconTextButton } from '../Button';

const ScheduleTab = ({ form, setField, toggleDay }) => {
  // Convertir días seleccionados al formato que espera Checklist
  const selectedDays = form.days_of_week || [];

  // Manejador de cambio para días
  const handleDayChange = (dayValue) => {
    let newSelectedDays;
    if (selectedDays.includes(dayValue)) {
      newSelectedDays = selectedDays.filter(d => d !== dayValue);
    } else {
      newSelectedDays = [...selectedDays, dayValue];
    }
    setField('days_of_week', newSelectedDays);
  };

  // Manejador para seleccionar todos
  const handleSelectAll = () => {
    if (selectedDays.length === DAYS.length) {
      setField('days_of_week', []);
    } else {
      setField('days_of_week', DAYS.map(d => d.value));
    }
  };

  // Verificar si todos están seleccionados
  const allSelected = selectedDays.length === DAYS.length;

  return (
    <div className="schedule-tab">
      {/* Días de la semana */}
      <div className="schedule-days-group">
        <div className="schedule-days-header">
          <label className="label">Días de la semana</label>
          <button 
            type="button"
            className="schedule-select-all-btn"
            onClick={handleSelectAll}
          >
            {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>
        <div className="schedule-days-grid">
          {DAYS.map((day) => (
            <label key={day.value} className="schedule-day-checkbox">
              <input
                type="checkbox"
                checked={selectedDays.includes(day.value)}
                onChange={() => handleDayChange(day.value)}
              />
              <span className="schedule-day-label">{day.label}</span>
            </label>
          ))}
        </div>
        <small className="help-text">Dejar vacío para todos los días</small>
      </div>

      {/* Horarios y fechas */}
      <div className="schedule-datetime-grid">
        {/* Horas - 2 columnas */}
        <div className="schedule-time-group">
          <div className="form-group">
            <label className="label">Hora inicio</label>
            <Input
              type="time"
              value={form.start_time || ''}
              onChange={(value) => setField('start_time', value)}
              size="md"
              className="schedule-input"
            />
          </div>
          <div className="form-group">
            <label className="label">Hora fin</label>
            <Input
              type="time"
              value={form.end_time || ''}
              onChange={(value) => setField('end_time', value)}
              size="md"
              className="schedule-input"
            />
          </div>
        </div>

        {/* Fechas - una por fila en móvil */}
        <div className="schedule-date-group">
          <div className="form-group">
            <label className="label">Fecha inicio</label>
            <Input
              type="date"
              value={form.start_date?.split('T')[0] || ''}
              onChange={(value) => setField('start_date', value)}
              size="md"
              className="schedule-input"
            />
            <small className="help-text">dd/mm/aaaa</small>
          </div>
          <div className="form-group">
            <label className="label">Fecha fin</label>
            <Input
              type="date"
              value={form.end_date?.split('T')[0] || ''}
              onChange={(value) => setField('end_date', value)}
              size="md"
              className="schedule-input"
            />
            <small className="help-text">dd/mm/aaaa</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTab;