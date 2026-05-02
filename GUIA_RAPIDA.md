# 🚀 GUÍA RÁPIDA - Nuevas Características

## 1️⃣ TokenManager - Gestión de Tokens

### ¿Qué es?
Sistema centralizado para manejar tokens de autenticación y usuarios.

### Importar
```javascript
import TokenManager from '@/utils/tokenManager';
```

### Métodos disponibles

#### Guardar datos
```javascript
// Guardar token
TokenManager.setToken('eyJhbGc...');

// Guardar usuario
TokenManager.setUser({ id: 1, name: 'Juan', email: 'juan@example.com' });

// Guardar negocio
TokenManager.setBusiness({ id: 123, name: 'Mi Negocio', schemaName: 'neg_123' });
```

#### Leer datos
```javascript
const token = TokenManager.getToken();
const user = TokenManager.getUser();
const business = TokenManager.getBusiness();
```

#### Verificar autenticación
```javascript
if (TokenManager.isAuthenticated()) {
  console.log('Usuario autenticado');
} else {
  console.log('No autenticado');
}
```

#### Trabajar con JWT
```javascript
const payload = TokenManager.decodeToken(token);
// payload = { id: 1, email: 'user@email.com', exp: 1234567890, ... }

const msRemaining = TokenManager.getTokenTimeRemaining(token);
if (msRemaining < 5 * 60 * 1000) {
  // Menos de 5 minutos, mostrar alerta
}

if (TokenManager.isTokenExpired(token)) {
  // Token expirado, hacer logout
}
```

#### Limpiar todo
```javascript
TokenManager.clear(); // Elimina: authToken, idonUser, selectedBusiness
```

### ✅ Casos de Uso

**Login:**
```javascript
const { token, user } = await loginAPI();
TokenManager.setToken(token);
TokenManager.setUser(user);
```

**Logout:**
```javascript
TokenManager.clear();
navigate('/login');
```

**Middleware de verificación:**
```javascript
function ProtectedComponent() {
  if (!TokenManager.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return <YourComponent />;
}
```

---

## 2️⃣ NotificationContext - Notificaciones Modernas

### ¿Qué es?
Sistema de notificaciones tipo toast que reemplaza `alert()`.

### Setup (Ya está en App.js)
```javascript
<NotificationProvider>
  <App />
</NotificationProvider>
```

### Usar en componentes
```javascript
import { useNotification } from '@/context/NotificationContext';

function MiComponente() {
  const { success, error, warning, info } = useNotification();

  return (
    <div>
      <button onClick={() => success('¡Éxito!')}>
        Mostrar éxito
      </button>
      <button onClick={() => error('Algo salió mal')}>
        Mostrar error
      </button>
    </div>
  );
}
```

### Métodos disponibles

```javascript
const { notify, success, error, warning, info, removeNotification } = useNotification();

// Notificaciones rápidas
success('Guardado correctamente');    // Auto-cierra en 3s
error('Error inesperado');            // Auto-cierra en 4s
warning('¿Estás seguro?');            // Auto-cierra en 3s
info('Nueva información disponible');  // Auto-cierra en 3s

// Notificación personalizada
const id = notify('Mensaje custom', 'success', 5000); // 5 segundos

// Cerrar manualmente
removeNotification(id);
```

### ✅ Casos de Uso

**Guardar datos:**
```javascript
const handleSave = async () => {
  try {
    await saveAPI();
    success('Guardado correctamente');
  } catch (err) {
    error(err.message || 'Error al guardar');
  }
};
```

**Validaciones:**
```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  
  if (!email) {
    warning('El email es requerido');
    return;
  }
  
  // Procesar...
};
```

**Operaciones largas:**
```javascript
const handleDelete = async (item) => {
  try {
    const id = notify('Eliminando...', 'info', 0); // No auto-cierra
    await deleteAPI(item);
    removeNotification(id);
    success('Eliminado correctamente');
  } catch (err) {
    error('No se pudo eliminar');
  }
};
```

---

## 3️⃣ fetchWithAuth - Requests Consistentes

### ¿Qué es?
Función que hace requests HTTP con autenticación automática.

### Usar
```javascript
import { fetchWithAuth } from '@/config/apiBase';

// GET
const res = await fetchWithAuth('/api/users');

// POST
const res = await fetchWithAuth('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Juan' })
});

// PUT
const res = await fetchWithAuth('/api/users/1', {
  method: 'PUT',
  body: JSON.stringify({ name: 'Juan Nuevo' })
});

// DELETE
const res = await fetchWithAuth('/api/users/1', {
  method: 'DELETE'
});

// File upload
const form = new FormData();
form.append('file', fileInput.files[0]);
const res = await fetchWithAuth('/api/upload', {
  method: 'POST',
  body: form
});
```

### Headers automáticos
```javascript
// fetchWithAuth automáticamente incluye:
// - Authorization: Bearer {token}
// - X-Business-ID: {business.id}
// - X-DB-Name: {business.schemaName}
// - Content-Type: application/json
```

### ✅ Casos de Uso

**Obtener datos:**
```javascript
const res = await fetchWithAuth('/api/products');
if (res.ok) {
  const data = await res.json();
  setProducts(data);
} else {
  error('No se pudieron cargar los productos');
}
```

**Crear con validación:**
```javascript
const handleCreate = async (formData) => {
  try {
    const res = await fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(formData)
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Error al crear');
    }

    success('Producto creado');
    return data;
  } catch (err) {
    error(err.message);
    return null;
  }
};
```

---

## 🔄 Flujo Completo: Login → API Call → Notificación

```javascript
import { useNotification } from '@/context/NotificationContext';
import TokenManager from '@/utils/tokenManager';
import { fetchWithAuth } from '@/config/apiBase';

function Dashboard() {
  const { success, error } = useNotification();
  const [products, setProducts] = useState([]);

  // Verificar autenticación
  useEffect(() => {
    if (!TokenManager.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadProducts();
  }, []);

  // Cargar productos
  const loadProducts = async () => {
    try {
      const res = await fetchWithAuth('/api/products');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setProducts(data);
    } catch (err) {
      error(err.message);
    }
  };

  // Guardar producto
  const handleSave = async (product) => {
    try {
      const res = await fetchWithAuth('/api/products', {
        method: 'POST',
        body: JSON.stringify(product)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      success('Producto guardado');
      loadProducts();
    } catch (err) {
      error(err.message);
    }
  };

  return (
    <div>
      {/* UI aquí */}
    </div>
  );
}

export default Dashboard;
```

---

## ⚠️ Errores Comunes

### ❌ No usar TokenManager
```javascript
// MALO
const token = localStorage.getItem('idonToken');
```

```javascript
// BUENO
const token = TokenManager.getToken();
```

### ❌ Olvidar useNotification en provider
```javascript
// MALO - App.js sin NotificationProvider
<BrowserRouter>
  <AuthProvider>
    <AppShell />
  </AuthProvider>
</BrowserRouter>
```

```javascript
// BUENO - App.js
<BrowserRouter>
  <NotificationProvider>
    <AuthProvider>
      <AppShell />
      <NotificationDisplay />
    </AuthProvider>
  </NotificationProvider>
</BrowserRouter>
```

### ❌ No usar fetchWithAuth
```javascript
// MALO - Falta Authorization
fetch('/api/products', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

```javascript
// BUENO - Incluye todo automático
fetchWithAuth('/api/products', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

---

## 📚 Documentación Completa

Ver archivos:
- **TokenManager:** `src/utils/tokenManager.js`
- **NotificationContext:** `src/context/NotificationContext.js`
- **API Base:** `src/config/apiBase.js`
- **Resumen de cambios:** `RESUMEN_CAMBIOS.md`

---

## ✨ Resumen Rápido

| Necesidad | Usar | Ubicación |
|-----------|------|-----------|
| Manejar tokens | `TokenManager` | `@/utils/tokenManager` |
| Mostrar notificación | `useNotification()` | `@/context/NotificationContext` |
| Hacer API calls | `fetchWithAuth()` | `@/config/apiBase` |

¡Eso es todo! 🎉
