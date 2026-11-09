const WORKER_URL = 'https://proxy-cors.system-design-ec.workers.dev/';

function separarNombresApellidos(nombreCompleto) {
  if (typeof nombreCompleto !== 'string' || !nombreCompleto.trim()) {
    return { apellidos: '', nombres: '' };
  }

  const partes = nombreCompleto.trim().toUpperCase().split(/\s+/);

  if (partes.length === 4) {
    return {
      apellidos: `${partes[2]} ${partes[3]}`,
      nombres: `${partes[0]} ${partes[1]}`,
    };
  }

  if (partes.length === 3) {
    return {
      apellidos: `${partes[1]} ${partes[2]}`,
      nombres: partes[0],
    };
  }

  return { apellidos: nombreCompleto.trim().toUpperCase(), nombres: '' };
}

export function formatearNombreEcuador(nombreCompleto) {
  if (typeof nombreCompleto !== 'string' || !nombreCompleto.trim()) return '';

  const partes = nombreCompleto.trim().toUpperCase().split(/\s+/);

  if (partes.length === 4) return `${partes[2]} ${partes[3]} ${partes[0]} ${partes[1]}`;
  if (partes.length === 3) return `${partes[1]} ${partes[2]} ${partes[0]}`;

  return nombreCompleto.trim().toUpperCase();
}

export async function consultarDocumento(documento) {
  const doc = String(documento ?? '').trim();
  if (!/^(?:\d{10}|\d{13})$/.test(doc)) return null;

  try {
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento: doc }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data !== 'object' || data.error) return null;

    if (data.tipo === 'cedula') {
      return {
        ...data,
        nombreFormateado: formatearNombreEcuador(data.nombre),
        nombresSeparados: separarNombresApellidos(data.nombre),
      };
    }

    if (data.tipo === 'ruc') {
      return {
        ...data,
        nombreFormateado: typeof data.razonSocial === 'string'
          ? data.razonSocial.toUpperCase()
          : '',
      };
    }

    return data;
  } catch (error) {
    console.error('Error consultando Worker:', error);
    return null;
  }
}
