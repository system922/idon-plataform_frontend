import React, { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import {
  User as FiUser,
  Calendar as FiCalendar,
  Clock as FiClock,
  Edit2 as FiEdit2,
  Trash2 as FiTrash2,
  Plus as FiPlus,
  RefreshCw as FiRefreshCw
} from 'react-feather';

export default function ShiftsPage() {
  const { showConfirm } = useConfirm();
  const [shifts, setShifts] = useState([
    {
      id: 1,
      name: 'Carlos López',
      position: 'Vendedor',
      shift: 'Mañana',
      days: 'Lun a Vie',
      entry: '08:00',
      exit: '17:00',
      break: '13:00 - 14:00'
    },
    {
      id: 2,
      name: 'Sandra Méndez',
      position: 'Gerente',
      shift: 'Tarde',
      days: 'Lun a Sab',
      entry: '12:00',
      exit: '21:00',
      break: '15:00 - 16:00'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Eliminar este turno?')) return;
    setShifts(shifts.filter(e => e.id !== id));
  };

  const handleLoadAll = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const headerAction = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button onClick={handleLoadAll} style={{
        padding: '8px 12px',
        background: 'var(--color-primary)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <FiRefreshCw size={14} /> Actualizar
      </button>
      <button style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'var(--color-primary)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600'
      }}>
        <FiPlus size={14} /> Nuevo turno
      </button>
    </div>
  );

  return (
    <PageTemplate 
      title="Horarios y Turnos" 
      subtitle="Gestiona los horarios de entrada y salida del personal"
      theme="business"
      loading={loading}
      headerAction={headerAction}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {shifts.map((s) => (
          <div key={s.id} style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '18px',
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'var(--color-primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <FiUser size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{s.name}</h4>
                <p style={{ margin: '4px 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {s.position}
                </p>
              </div>
            </div>
            {/* Info turno */}
            <div style={{ marginBottom: 7, marginTop: 7, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <FiCalendar size={13} /> <strong>{s.shift}</strong> · <span>{s.days}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <FiClock size={13} /> 
                {s.entry} <span style={{color:'#aaa'}}>a</span> {s.exit}
                <span style={{marginLeft:8, background:'rgba(104,66,254,0.06)', borderRadius:6, padding:'2px 9px'}}>
                  {s.break && <>Descanso: <span style={{fontWeight:'500'}}>{s.break}</span></>}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
              <button style={{
                flex: 1,
                padding: '8px 12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                <FiEdit2 size={12} /> Editar
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: '#c33',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                <FiTrash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageTemplate>
  );
}