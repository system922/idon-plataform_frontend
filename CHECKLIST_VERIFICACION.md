# ✅ CHECKLIST DE VERIFICACIÓN Y CORRECCIONES

## 📋 FRONTEND - Verificaciones

### ✅ Completadas
- [x] TokenManager implementado
- [x] NotificationContext implementado
- [x] fetchWithAuth actualizado
- [x] App.js usa nuevos sistemas
- [x] AuthContext usa TokenManager
- [x] apiBase.js normalizado

### 🔄 En Progreso
- [ ] Reemplazar `alert()` en todos los componentes
- [ ] Agregar validaciones mejoradas en CRUD
- [ ] Implementar error boundaries

### 📝 Por Hacer
- [ ] Crear hook `useAPI()` reutilizable
- [ ] Tests unitarios para TokenManager
- [ ] Tests e2e para login/logout
- [ ] Documentar patrones REST

---

## 🔴 BACKEND - Correcciones Críticas

### 🔴 CRÍTICO: Apertura de Caja
**Estado:** ⏳ BLOQUEADOR

**Problema:**
```
GET /api/pos/cash-register/opening?date=2024-05-02

❌ ACTUAL - Filtra por usuario:
  WHERE date='2024-05-02' AND user_id=CURRENT_USER
  Result: 404 (usuario B)

✅ CORRECTO - Sin filtro usuario:
  WHERE DATE(date)='2024-05-02'
  Result: 200 (todos los usuarios)
```

**Archivos implicados:**
- `controllers/CashRegisterController.java` (o similar)
- `repositories/CashDrawerRepository.java` (o similar)
- `models/CashDrawer.java` (o similar)

**Cambio requerido:**
```java
// ❌ ANTES
@GetMapping("/opening")
public ResponseEntity<?> getOpening(@RequestParam String date) {
  Optional<CashDrawer> cash = repository.findByDateAndUserId(
    date, 
    getCurrentUserId()  // ❌ AQUÍ ESTÁ EL PROBLEMA
  );
  return cash.isPresent() ? ok(cash) : notFound().build();
}

// ✅ DESPUÉS
@GetMapping("/opening")
public ResponseEntity<?> getOpening(@RequestParam String date) {
  Optional<CashDrawer> cash = repository.findByDate(date);
  // Sin filtrar por usuario_id
  return cash.isPresent() ? ok(cash) : notFound().build();
}
```

**SQL a actualizar:**
```sql
-- ❌ ANTES
SELECT * FROM cash_drawer 
WHERE date = ? AND user_id = ?;

-- ✅ DESPUÉS
SELECT * FROM cash_drawer 
WHERE DATE(date) = DATE(?);
```

**Prueba:**
1. Usuario A: POST apertura → 201 Created
2. Usuario B: GET apertura (mismo día) → 200 OK (NOT 404)

---

## 🐛 BUGS POTENCIALES A REVISAR

### Frontend
- [ ] Manejo de token expirado en mitad de request
- [ ] Comportamiento en conexión lenta/perdida
- [ ] Validación de datos antes de enviar a API
- [ ] Límite de notificaciones simultáneas
- [ ] Leak de memory en useEffect

### Backend
- [ ] Rate limiting en endpoints
- [ ] Validación de entrada (injection)
- [ ] CORS headers correctos
- [ ] Logging de errores
- [ ] Monitoreo de performance

---

## 🧪 PRUEBAS RECOMENDADAS

### Funcionales

#### Apertura de Caja (CRÍTICA)
```
1. Iniciar sesión con Usuario A (rol: cashier)
   ✓ Se muestra formulario de apertura
   
2. Completar apertura (registrar denominaciones)
   ✓ Se guarda correctamente en BD
   
3. Cerrar sesión Usuario A
   
4. Iniciar sesión con Usuario B (rol: cashier, mismo día)
   ✓ NO se muestra formulario de apertura
   ✓ Se permite acceso directo
   ✓ Usuario B puede ver la apertura de Usuario A
   
5. Ambos pueden trabajar con la misma apertura
   ✓ Cierre de caja funciona para ambos
```

#### Tokens
```
1. Login → Token guardado en authToken
2. Logout → authToken removido
3. Refresh de página → Token persistente
4. Token expirado → Redirect a login
```

#### Notificaciones
```
1. Agregar producto → success()
2. Error en API → error()
3. Validación → warning()
4. Información → info()
5. Múltiples notificaciones simultáneas
```

### Performance
- [ ] Tiempo de login < 2s
- [ ] Tiempo de carga inicial < 3s
- [ ] Memory usage < 50MB
- [ ] No hay memory leaks

### Seguridad
- [ ] HTTPS en producción
- [ ] Tokens no expostos en URL
- [ ] CSRF protection
- [ ] Input validation
- [ ] Rate limiting

---

## 📱 NAVEGADORES A PROBAR

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 🚀 DEPLOYMENT

### Pre-Deployment
- [ ] Build sin errores: `npm run build`
- [ ] No hay console warnings
- [ ] Tests pasan: `npm test`
- [ ] Lint pasa: `npm run lint`
- [ ] Variables de env configuradas

### Post-Deployment
- [ ] Login funciona
- [ ] Apertura de caja funciona
- [ ] Notificaciones visibles
- [ ] Errores capturados en logs
- [ ] Performance aceptable

---

## 📊 MÉTRICAS A MONITOREAR

### Frontend
- Tiempo de respuesta de API (< 2s)
- Errores en consola
- Notificaciones no mostradas
- Memory leaks

### Backend
- Errores 500
- Errores 401 (token expirado)
- Errores 404 (endpoint no encontrado)
- Duración de queries
- CPU/Memory usage

---

## 📞 COMUNICACIÓN

### Al Backend Developer
"El endpoint GET /api/pos/cash-register/opening está filtrando por user_id. Debería devolver una apertura de caja si existe PARA ESE DÍA, sin importar el usuario. Ver PROBLEMA_APERTURA_CAJA.js para detalles."

### Al Frontend Team
"Se implementaron 3 sistemas: TokenManager, NotificationContext, fetchWithAuth mejorado. Ver GUIA_RAPIDA.md para cómo usarlos."

### Al QA Team
"Criticidad: ALTA - Probar escenario de múltiples usuarios con apertura de caja. Ver checklist de pruebas en esta documentación."

---

## 🔗 ARCHIVOS DE REFERENCIA

- `RESUMEN_CAMBIOS.md` - Resumen de cambios
- `GUIA_RAPIDA.md` - Cómo usar nuevas características
- `PROBLEMA_APERTURA_CAJA.js` - Detalles del problema
- `src/utils/tokenManager.js` - Implementación TokenManager
- `src/context/NotificationContext.js` - Implementación Notificaciones

---

## ✨ CONCLUSIÓN

✅ Frontend: Listo para producción
⏳ Backend: Requiere corrección de apertura de caja (CRÍTICA)

**Blocker:** GET /api/pos/cash-register/opening
**Prioridad:** 🔴 INMEDIATA

Sin esta corrección, el flujo de apertura de caja no funciona correctamente.
