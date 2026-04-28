# IDON - Sistema Multi-Tenant SaaS

## Inicio Rápido

### Requisitos Previos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd idon-plataform
```

2. **Configurar BACKEND**
```bash
cd BACKEND
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL

npm install
npm run migrate:control-plane  # Ejecuta migraciones
npm run dev  # Inicia servidor en puerto 5000
```

3. **Configurar FRONTEND**
```bash
cd ../FRONTEND
cp .env.example .env
npm install
npm start  # Inicia en puerto 3000
```

### Acceso Inicial

- **Panel de Registro**: http://localhost:3000/register
- **Login**: http://localhost:3000/login
- **Login Negocio**: http://localhost:3000/business-login

## Estructura del Proyecto

```
idon-plataform/
├── BACKEND/
│   ├── src/
│   │   ├── app.js                    # Express application
│   │   ├── index.js                  # Entry point
│   │   ├── config/                   # Configuration files
│   │   ├── db/                       # Database & migrations
│   │   ├── services/                 # Business logic
│   │   ├── routes/                   # API endpoints
│   │   ├── middleware/               # Express middleware
│   │   └── utils/                    # Utilities
│   └── package.json
├── FRONTEND/
│   ├── src/
│   │   ├── pages/                    # Page components
│   │   ├── components/               # Reusable components
│   │   ├── services/                 # API services
│   │   ├── context/                  # React context
│   │   ├── utils/                    # Utilities
│   │   ├── hooks/                    # Custom hooks
│   │   └── index.js                  # Entry point
│   └── package.json
└── README.md
```

## Flujo Principal

### 1. Registro del Negocio
- Usuario accede a `/register`
- Completa información del negocio, propietario y selecciona módulos
- Se crea una solicitud de registro que espera aprobación

### 2. Aprobación por Admin
- Admin revisa solicitud en panel de administración
- Al aprobar:
  - Se crea el usuario propietario
  - Se crea el negocio
  - Se genera el schema de tenant en PostgreSQL
  - Se ejecutan migraciones de módulos seleccionados
  - Se activan módulos y características
  - Se crea suscripción en estado `pending_activation`

### 3. Activación de Suscripción
- Admin activa suscripción: estado cambia a `active`
- Se calcula fecha de próximo pago

### 4. Login del Negocio
- Propietario inicia sesión con email, contraseña y slug
- Obtiene token JWT con contexto del negocio
- Accede a menú dinámico basado en:
  - Módulos activos
  - Rol del usuario
  - Características habilitadas

### 5. Menú Dinámico
- Backend construye menú personalizado por:
  - Negocio
  - Rol del usuario
  - Features activas
- Frontend renderiza sidebar dinámicamente

## Base de Datos

### Control-Plane (public schema)
Tablas globales:
- `business_types` - Tipos de negocio
- `modules` - Módulos disponibles
- `features` - Características de módulos
- `module_pages` - Páginas/funcionalidades por módulo
- `roles` - Roles del sistema
- `role_page_permissions` - Permisos por rol/página
- `businesses` - Negocios registrados
- `users` - Usuarios del sistema
- `business_users` - Relación usuario-negocio
- `business_modules` - Módulos activos por negocio
- `business_features` - Features activas por negocio
- `business_registration_requests` - Solicitudes de registro
- `subscriptions` - Suscripciones

### Tenant Schema (tenant_*)
Por cada negocio se crea un schema con tablas según módulos activos:
- **core**: Configuración básica
- **pos**: Punto de Venta, productos, categorías
- **orders**: Órdenes, mesas, items de orden
- **inventory**: Inventario y stock

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/login-business` - Login de negocio
- `POST /api/auth/refresh` - Refrescar token

### Catálogo
- `GET /api/catalog/business-types` - Tipos de negocio
- `GET /api/catalog/business-types/:typeId/modules` - Módulos por tipo
- `GET /api/catalog/modules` - Todos los módulos
- `GET /api/catalog/modules/:moduleId/pages` - Páginas de un módulo

### Registro
- `POST /api/register` - Crear solicitud de registro
- `GET /api/register` - Listar solicitudes (admin)
- `GET /api/register/:requestId` - Obtener detalles

### Admin
- `POST /api/admin/:requestId/approve` - Aprobar registro
- `POST /api/admin/:requestId/reject` - Rechazar registro
- `GET /api/admin/pending` - Registros pendientes

### Navegación (Protegido)
- `GET /api/navigation` - Menú dinámico
- `GET /api/navigation/business/info` - Info del negocio
- `GET /api/navigation/business/modules` - Módulos del negocio

### Suscripción (Protegido)
- `GET /api/subscriptions` - Obtener suscripción
- `POST /api/subscriptions/:subscriptionId/activate` - Activar
- `POST /api/subscriptions/:subscriptionId/suspend` - Suspender
- `POST /api/subscriptions/:subscriptionId/cancel` - Cancelar

## Casos de Prueba QA

### Restaurante
1. Registrar negocio tipo "restaurante"
2. Seleccionar módulos: POS, Órdenes, Inventario
3. Admin aprueba y activa suscripción
4. Login con propietario
5. Verificar menú contiene: Dashboard, POS, Órdenes, Inventario

### Retail
1. Registrar negocio tipo "retail"
2. Módulos sugeridos: POS, Inventario
3. Admin aprueba
4. Verificar schema con tablas POS e Inventario

### Validaciones
- Cedula única
- Email único
- Slug único
- Documento válido (8-10 dígitos)
- Contraseña segura (8+ chars, 1 mayúscula, 1 número)

## Notas Importantes

- Las migraciones se corren automáticamente al iniciar el backend
- Cada tenant tiene su propio schema en PostgreSQL
- El menú es completamente dinámico y configurable desde la DB
- RBAC se aplica a nivel de página/acción
- Los módulos son extensibles sin tocar el frontend
