# Flujo de Autenticación Automática con Strava

## Cómo Funciona

La aplicación implementa un flujo automático de conexión con Strava. Cuando un usuario se registra o inicia sesión, automáticamente se le redirige a Strava para autorizar el acceso a sus datos.

## Flujo Completo

### 1. Registro/Login del Usuario
- El usuario se registra o inicia sesión con email y contraseña en tu aplicación
- Los datos se guardan en la base de datos (tabla `User`)

### 2. Redirección Automática a Strava
- Después del login, el sistema verifica si el usuario tiene una cuenta de Strava conectada
- Si no tiene cuenta de Strava conectada, **automáticamente** redirige al usuario a Strava para autorizar
- El usuario NO necesita hacer clic en ningún botón

### 3. Autorización en Strava
- El usuario ve la página de autorización de Strava
- Debe hacer clic en "Autorizar" para permitir el acceso
- Strava redirige de vuelta a tu aplicación con un código de autorización

### 4. Guardado Automático de Datos
- Tu aplicación intercambia el código por tokens de acceso
- Obtiene la información del atleta (nombre, ID, etc.)
- **Guarda automáticamente** todos los datos en la base de datos:
  - `stravaId`: ID único del atleta
  - `accessToken`: Token para hacer peticiones a la API
  - `refreshToken`: Token para renovar el acceso
  - `firstName`, `lastName`: Nombre del atleta
  - `profile`: URL de la foto de perfil
  - `expiresAt`: Fecha de expiración del token

### 5. Redirección al Dashboard
- El usuario es redirigido al dashboard
- Puede ver que su cuenta de Strava está conectada
- Puede acceder a sus actividades inmediatamente

## Ventajas de este Flujo

✅ **Sin pasos manuales**: El usuario no necesita buscar un botón para conectar
✅ **Automático**: La conexión ocurre automáticamente después del login
✅ **Datos guardados**: Todos los tokens y datos se guardan en tu base de datos
✅ **Persistente**: Una vez conectado, el usuario no necesita volver a autorizar (hasta que expire el token)

## Manejo de Errores

Si el usuario cancela la autorización en Strava o hay un error:
- Se muestra un mensaje de error en el dashboard
- El usuario puede intentar conectar manualmente haciendo clic en "Intentar Conectar Manualmente"

## Renovación de Tokens

Los tokens de Strava expiran después de 6 horas. La aplicación:
- Detecta automáticamente cuando un token ha expirado
- Usa el `refreshToken` para obtener un nuevo token
- Actualiza los tokens en la base de datos automáticamente

## Configuración Requerida

Para que el flujo automático funcione, necesitas:

1. **Variables de entorno configuradas**:
   ```env
   STRAVA_CLIENT_ID="tu-client-id"
   STRAVA_CLIENT_SECRET="tu-client-secret"
   NEXT_PUBLIC_STRAVA_CLIENT_ID="tu-client-id"
   ```

2. **URL de redirección en Strava**:
   - Configurada como: `http://localhost:3000/api/strava/callback` (desarrollo)
   - O tu dominio de producción (producción)

## Personalización

Si quieres desactivar la conexión automática y usar un botón manual:

1. Edita `app/dashboard/page.tsx`
2. Comenta o elimina las líneas que hacen la redirección automática (líneas 29-34)
3. Usa el componente `<StravaConnect />` para mostrar un botón manual

