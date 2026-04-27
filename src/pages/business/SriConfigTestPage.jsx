import { useState, useEffect, useRef } from 'react';
import { FilePlus, CheckCircle, XCircle, Settings, Shield, LogIn, LogOut, RefreshCw } from 'react-feather';

const SRI_API = 'http://localhost:3000';

// ─── helpers ──────────────────────────────────────────────────────────────────

function sriHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ─── sub-componentes de UI ────────────────────────────────────────────────────

const card = {
  background: '#fff',
  border: '1.5px solid #e2e8f0',
  borderRadius: 14,
  padding: 24,
  boxShadow: '0 4px 24px rgba(90,60,170,0.07)',
};

const inputStyle = {
  width: '100%', padding: '9px 11px', borderRadius: 7,
  border: '1.5px solid #e2e8f0', fontSize: 13,
  boxSizing: 'border-box', outline: 'none',
};

const labelStyle = {
  fontSize: 11, fontWeight: 700, display: 'block',
  marginBottom: 4, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

function Alert({ type, msg }) {
  if (!msg) return null;
  const styles = {
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, borderRadius: 8, padding: '9px 14px', fontSize: 13 }}>
      {msg}
    </div>
  );
}

// ─── Panel de login ───────────────────────────────────────────────────────────

function LoginPanel({ onLogin }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch(`${SRI_API}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');
      onLogin(data.token, data.user, data.company);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <div style={{ ...card, width: 380 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#6842fe,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <LogIn size={24} color="#fff" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1a202c' }}>Prueba SRI</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            Inicia sesión en el backend f-sri
            <br />
            <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 7px', borderRadius: 20, marginTop: 4, display: 'inline-block' }}>
              {SRI_API}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email" value={email} autoFocus required
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password" value={password} required
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && <Alert type="error" msg={error} />}

          <button
            type="submit" disabled={loading}
            style={{
              marginTop: 4, padding: '10px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
              background: loading ? '#a78bfa' : 'linear-gradient(135deg,#6842fe,#7c3aed)',
              color: '#fff', cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Panel de firma electrónica ───────────────────────────────────────────────

function SignaturePanel({ token }) {
  const [cfg,       setCfg]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const fileRef = useRef();
  const [form, setForm] = useState({
    ruc: '', razon_social: '', nombre_comercial: '',
    direccion_matriz: '', ambiente: '1', password: '',
  });

  const loadConfig = () => {
    setLoading(true); setError('');
    fetch(`${SRI_API}/api/einvoicing/config`, { headers: sriHeaders(token) })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setCfg(data);
        setForm(f => ({
          ...f,
          ruc:              data.ruc              || '',
          razon_social:     data.razon_social     || '',
          nombre_comercial: data.nombre_comercial || '',
          direccion_matriz: data.direccion_matriz || '',
          ambiente:         data.ambiente         || '1',
        }));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadConfig(); }, []); // eslint-disable-line

  const handleSaveConfig = async () => {
    setError(''); setSuccess(''); setSaving(true);
    try {
      const res  = await fetch(`${SRI_API}/api/einvoicing/config`, {
        method: 'PUT',
        headers: sriHeaders(token),
        body: JSON.stringify({
          ruc:              form.ruc,
          razon_social:     form.razon_social,
          nombre_comercial: form.nombre_comercial,
          direccion_matriz: form.direccion_matriz,
          ambiente:         form.ambiente,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      setCfg(data);
      setSuccess('Configuración guardada correctamente');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleUpload = async () => {
    setError(''); setSuccess('');
    const file = fileRef.current?.files?.[0];
    if (!file)          { setError('Selecciona el archivo .p12'); return; }
    if (!form.password) { setError('Ingresa la contraseña del certificado'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file',             file);
      fd.append('password',         form.password);
      fd.append('ruc',              form.ruc);
      fd.append('razon_social',     form.razon_social);
      fd.append('nombre_comercial', form.nombre_comercial);
      fd.append('direccion_matriz', form.direccion_matriz);
      fd.append('ambiente',         form.ambiente);

      const res  = await fetch(`${SRI_API}/api/einvoicing/config/signature`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar firma');
      setCfg(data);
      setSuccess('Firma electrónica cargada correctamente');
      if (fileRef.current) fileRef.current.value = '';
      setForm(f => ({ ...f, password: '' }));
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
      <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: 10 }}>Cargando configuración…</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Mensajes */}
      {error   && <Alert type="error"   msg={error} />}
      {success && <Alert type="success" msg={success} />}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Datos del emisor ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6842fe,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Datos del Emisor</div>
              <div style={{ fontSize: 12, color: '#888' }}>Información fiscal de tu empresa</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'ruc',              label: 'RUC',              placeholder: '1390000000001' },
              { key: 'razon_social',     label: 'Razón Social',     placeholder: 'EMPRESA S.A.' },
              { key: 'nombre_comercial', label: 'Nombre Comercial', placeholder: 'Mi Negocio' },
              { key: 'direccion_matriz', label: 'Dirección Matriz', placeholder: 'Av. Principal 123' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={inputStyle}
                />
              </div>
            ))}

            <div>
              <label style={labelStyle}>Ambiente SRI</label>
              <select
                value={form.ambiente}
                onChange={e => setForm(f => ({ ...f, ambiente: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="1">Pruebas (Certificación)</option>
                <option value="2">Producción</option>
              </select>
            </div>

            <button
              onClick={handleSaveConfig} disabled={saving}
              style={{
                marginTop: 4, padding: '10px 0', width: '100%', border: 'none', borderRadius: 8,
                background: saving ? '#a78bfa' : 'linear-gradient(135deg,#6842fe,#7c3aed)',
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer',
              }}
            >
              {saving ? 'Guardando…' : 'Guardar configuración'}
            </button>
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Estado del certificado */}
          <div style={{
            ...card,
            background: cfg?.has_signature
              ? 'linear-gradient(135deg,rgba(34,197,94,0.07),rgba(16,185,129,0.04))'
              : 'linear-gradient(135deg,rgba(225,29,72,0.06),rgba(239,68,68,0.03))',
            border: cfg?.has_signature ? '1.5px solid rgba(34,197,94,0.3)' : '1.5px solid rgba(225,29,72,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: cfg?.has_signature ? 14 : 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: cfg?.has_signature ? 'rgba(34,197,94,0.15)' : 'rgba(225,29,72,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cfg?.has_signature ? <CheckCircle color="#22c55e" size={24} /> : <XCircle color="#e11d48" size={24} />}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: cfg?.has_signature ? '#15803d' : '#b91c1c' }}>
                  {cfg?.has_signature ? 'Certificado activo' : 'Sin certificado'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {cfg?.has_signature ? 'Firma electrónica cargada' : 'Carga tu archivo .p12'}
                </div>
              </div>
            </div>

            {cfg?.has_signature && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 8, borderTop: '1px solid rgba(34,197,94,0.15)' }}>
                {[
                  { l: 'RUC',          v: cfg.ruc },
                  { l: 'Empresa',      v: cfg.razon_social },
                  { l: 'Válido hasta', v: cfg.cert_valid_until },
                ].filter(r => r.v).map(({ l, v }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#888' }}>{l}</span>
                    <span style={{ fontWeight: 700, maxWidth: 200, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#888' }}>Ambiente</span>
                  <span style={{
                    fontWeight: 700,
                    color: cfg.ambiente === '2' ? '#059669' : '#d97706',
                    background: cfg.ambiente === '2' ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                    padding: '2px 8px', borderRadius: 20, fontSize: 12,
                  }}>
                    {cfg.ambiente === '2' ? 'Producción' : 'Pruebas'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cargar firma */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: cfg?.has_signature ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#6842fe,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {cfg?.has_signature ? <Shield size={16} color="#fff" /> : <FilePlus size={16} color="#fff" />}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {cfg?.has_signature ? 'Reemplazar certificado' : 'Cargar firma electrónica'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Archivo .p12 del SRI</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Archivo .p12</label>
                <input
                  ref={fileRef} type="file" accept=".p12"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1.5px dashed #e2e8f0', fontSize: 13, boxSizing: 'border-box', cursor: 'pointer', background: '#f8fafc' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Contraseña del certificado</label>
                <input
                  type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Contraseña del .p12"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleUpload} disabled={uploading}
                style={{
                  padding: '10px 0', width: '100%', border: 'none', borderRadius: 8,
                  background: uploading ? '#d1d5db' : cfg?.has_signature
                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                    : 'linear-gradient(135deg,#6842fe,#7c3aed)',
                  color: '#fff', fontWeight: 700, fontSize: 14, cursor: uploading ? 'default' : 'pointer',
                }}
              >
                {uploading ? 'Cargando…' : cfg?.has_signature ? 'Reemplazar certificado' : 'Cargar certificado'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SriConfigTestPage() {
  const [token,   setToken]   = useState(() => sessionStorage.getItem('sriTestToken') || '');
  const [user,    setUser]    = useState(null);
  const [company, setCompany] = useState(null);

  const handleLogin = (tok, u, c) => {
    sessionStorage.setItem('sriTestToken', tok);
    setToken(tok); setUser(u); setCompany(c);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sriTestToken');
    setToken(''); setUser(null); setCompany(null);
  };

  if (!token) return <LoginPanel onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '24px 32px' }}>

      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1a202c' }}>Firma Electrónica — Prueba SRI</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
            Conectado a <span style={{ fontWeight: 700, color: '#6842fe' }}>{SRI_API}</span>
            {company && <> · {company.ruc} {company.razon_social}</>}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#fff', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>

      <SignaturePanel token={token} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
