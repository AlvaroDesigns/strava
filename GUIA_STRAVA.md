# Guía para Obtener Credenciales de Strava

## Paso 1: Acceder a la Configuración de API de Strava

1. Ve a la página de configuración de API de Strava:
   **https://www.strava.com/settings/api**

2. Si no has iniciado sesión, inicia sesión con tu cuenta de Strava.

## Paso 2: Crear una Nueva Aplicación

1. En la página de configuración, busca la sección **"My API Application"** o **"Your API Applications"**.

2. Haz clic en el botón **"Create New App"** o **"Create App"**.

## Paso 3: Completar el Formulario

Completa el formulario con la siguiente información:

- **Application Name**: 
  - Ejemplo: "Mi App Strava" o "Strava Integration"
  - Este es el nombre que verás en tu lista de aplicaciones

- **Category**: 
  - Selecciona una categoría apropiada (por ejemplo: "Training", "Analytics", etc.)

- **Website**: 
  - Para desarrollo local: `http://localhost:3000`
  - Para producción: tu dominio real (ej: `https://tudominio.com`)

- **Application Description** (opcional):
  - Describe brevemente qué hace tu aplicación

- **Authorization Callback Domain**: 
  - Para desarrollo local: `localhost:3000`
  - Para producción: tu dominio sin `http://` o `https://` (ej: `tudominio.com`)

## Paso 4: Obtener las Credenciales

Después de crear la aplicación, verás:

1. **Client ID**: Un número que identifica tu aplicación
   - Ejemplo: `12345`

2. **Client Secret**: Una cadena secreta que debes mantener privada
   - Ejemplo: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0`

⚠️ **IMPORTANTE**: Guarda estas credenciales de forma segura. El Client Secret solo se muestra una vez.

## Paso 5: Configurar la URL de Redirección

1. En la página de tu aplicación, busca el campo **"Authorization Callback Domain"** o **"Redirect URI"**.

2. Asegúrate de que esté configurado como:
   - Para desarrollo: `localhost:3000`
   - O la URL completa: `http://localhost:3000/api/strava/callback`

## Paso 6: Agregar las Variables al Archivo .env

Abre tu archivo `.env` y agrega:

```env
# Strava OAuth
STRAVA_CLIENT_ID="tu-client-id-aqui"
STRAVA_CLIENT_SECRET="tu-client-secret-aqui"
NEXT_PUBLIC_STRAVA_CLIENT_ID="tu-client-id-aqui"
```

**Nota**: `NEXT_PUBLIC_STRAVA_CLIENT_ID` debe tener el mismo valor que `STRAVA_CLIENT_ID` porque se usa en el cliente (navegador).

## Ejemplo Completo de .env

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-generado-con-openssl"

# Strava OAuth
STRAVA_CLIENT_ID="12345"
STRAVA_CLIENT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
NEXT_PUBLIC_STRAVA_CLIENT_ID="12345"
```

## Verificación

Para verificar que todo está configurado correctamente:

1. Reinicia tu servidor de desarrollo: `npm run dev`
2. Inicia sesión en tu aplicación
3. Ve al dashboard
4. Haz clic en "Conectar con Strava"
5. Deberías ser redirigido a Strava para autorizar

## Solución de Problemas

### Error: "redirect_uri_mismatch"
- Verifica que la URL de redirección en Strava coincida exactamente con: `http://localhost:3000/api/strava/callback`
- Asegúrate de que no haya espacios o caracteres extra

### Error: "invalid_client"
- Verifica que el `STRAVA_CLIENT_ID` y `STRAVA_CLIENT_SECRET` sean correctos
- Asegúrate de que no haya comillas extra en el archivo `.env`

### No aparece el botón de conectar
- Verifica que `NEXT_PUBLIC_STRAVA_CLIENT_ID` esté configurado
- Reinicia el servidor después de cambiar variables de entorno

## Enlaces Útiles

- [Página de Configuración de API de Strava](https://www.strava.com/settings/api)
- [Documentación de OAuth de Strava](https://developers.strava.com/docs/authentication/)
- [Guía de OAuth de Strava](https://developers.strava.com/docs/getting-started/)

