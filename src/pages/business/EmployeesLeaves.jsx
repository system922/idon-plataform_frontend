import { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Plus, Check, X, Search, Calendar } from 'react-feather';

/* ================= MOCK ================= */
const MOCK = [
  {
    id: 1,
    employee: "Juan Pérez",
    type: "Vacaciones",
    from: "2026-04-01",
    to: "2026-04-05",
    status: "Pendiente",
  },
  {
    id: 2,
    employee: "María López",
    type: "Permiso",
    from: "2026-04-10",
    to: "2026-04-10",
    status: "Aprobado",
  }
];

const EMPTY = {
  employee: '',
  type: 'Vacaciones',
  from: '',
  to: '',
  status: 'Pendiente'
};

/* ================= MODAL ================= */
function LeaveModal({ data, onClose, onSave }) {
  const [form, setForm] = useState(data ? { ...data } : { ...EMPTY });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* HEADER */}
        <div style={header}>
          <h2>{data ? 'Editar solicitud' : 'Nueva solicitud'}</h2>
          <button onClick={onClose}><X size={18}/></button>
        </div>

        {/* BODY */}
        <div style={{ padding: 20, display: 'grid', gap: 12 }}>
          <input
            placeholder="Empleado"
            value={form.employee}
            onChange={e => set('employee', e.target.value)}
            style={input}
          />

          <select value={form.type} onChange={e => set('type', e.target.value)} style={input}>
            <option>Vacaciones</option>
            <option>Permiso</option>
          </select>

          <input type="date" value={form.from} onChange={e => set('from', e.target.value)} style={input}/>
          <input type="date" value={form.to} onChange={e => set('to', e.target.value)} style={input}/>

          <select value={form.status} onChange={e => set('status', e.target.value)} style={input}>
            <option>Pendiente</option>
            <option>Aprobado</option>
            <option>Rechazado</option>
          </select>
        </div>

        {/* FOOTER */}
        <div style={footer}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={() => onSave(form)} style={btnPrimary}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default function EmployeesLeavesPage() {
  const [leaves, setLeaves] = useState(MOCK);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);

  const filtered = leaves.filter(l =>
    l.employee.toLowerCase().includes(search.toLowerCase())
  );

  const save = (form) => {
    if (editing) {
      setLeaves(prev =>
        prev.map(l => l.id === editing.id ? { ...form, id: editing.id } : l)
      );
    } else {
      setLeaves(prev => [...prev, { ...form, id: Date.now() }]);
    }
    setShow(false);
  };

  const changeStatus = (id, status) => {
    setLeaves(prev =>
      prev.map(l => l.id === id ? { ...l, status } : l)
    );
  };

  const headerAction = (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={searchIcon}/>
        <input
          placeholder="Buscar empleado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={searchInput}
        />
      </div>

      <button onClick={() => setShow(true)} style={btnPrimary}>
        <Plus size={14}/> Nueva
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Permisos y vacaciones"
      subtitle="Gestiona solicitudes del personal"
      headerAction={headerAction}
    >
      <div style={card}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Tipo</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={empty}>
                  <Calendar size={30}/>
                  <div>No hay solicitudes</div>
                </td>
              </tr>
            )}

            {filtered.map(l => (
              <tr key={l.id}>
                <td>{l.employee}</td>
                <td>{l.type}</td>
                <td>{l.from}</td>
                <td>{l.to}</td>

                <td>
                  <span style={statusStyle(l.status)}>
                    {l.status}
                  </span>
                </td>

                <td>
                  {l.status === 'Pendiente' && (
                    <>
                      <button onClick={() => changeStatus(l.id, 'Aprobado')} style={approveBtn}>
                        <Check size={14}/>
                      </button>
                      <button onClick={() => changeStatus(l.id, 'Rechazado')} style={rejectBtn}>
                        <X size={14}/>
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {show && (
        <LeaveModal
          data={editing}
          onClose={() => setShow(false)}
          onSave={save}
        />
      )}
    </PageTemplate>
  );
}

/* ================= STYLES ================= */
const card = {
  background:'rgba(255,255,255,0.03)',
  border:'1px solid rgba(255,255,255,0.1)',
  borderRadius:12,
  padding:20
};

const input = {
  padding:10,
  borderRadius:8,
  background:'rgba(0,0,0,0.3)',
  color:'#fff',
  border:'1px solid rgba(255,255,255,0.1)'
};

const btnPrimary = {
  background:'#6842fe',
  color:'#fff',
  border:'none',
  padding:'8px 16px',
  borderRadius:8
};

const btnSecondary = {
  background:'transparent',
  border:'1px solid rgba(255,255,255,0.2)',
  color:'#fff',
  padding:'8px 16px',
  borderRadius:8
};

const approveBtn = {
  background:'#10b981',
  border:'none',
  padding:6,
  marginRight:6,
  borderRadius:6,
  cursor:'pointer'
};

const rejectBtn = {
  background:'#ef4444',
  border:'none',
  padding:6,
  borderRadius:6,
  cursor:'pointer'
};

const statusStyle = (s) => ({
  color:
    s === 'Aprobado' ? '#10b981' :
    s === 'Rechazado' ? '#ef4444' :
    '#f59e0b'
});

const overlay = {
  position:'fixed',
  inset:0,
  background:'rgba(0,0,0,0.7)',
  display:'flex',
  justifyContent:'center',
  alignItems:'center'
};

const modal = {
  background:'#141920',
  borderRadius:12,
  width:400
};

const header = {
  display:'flex',
  justifyContent:'space-between',
  padding:16
};

const footer = {
  display:'flex',
  justifyContent:'flex-end',
  gap:10,
  padding:16
};

const searchInput = {
  padding:'8px 12px 8px 30px',
  borderRadius:8,
  background:'rgba(0,0,0,0.3)',
  color:'#fff'
};

const searchIcon = {
  position:'absolute',
  left:8,
  top:'50%',
  transform:'translateY(-50%)'
};

const empty = {
  textAlign:'center',
  padding:30,
  opacity:0.5
};