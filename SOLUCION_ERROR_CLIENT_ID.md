# Solución: Error "invalid client_id" de Strava

## Problema

El error `"field": "client_id", "code": "invalid"` indica que el `client_id` que estás usando no es válido o no está configurado correctamente.

## Solución

### 1. Verifica que tienes los valores reales de Strava

Abre tu archivo `.env` y verifica que NO tengas valores de ejemplo como:

```env
STRAVA_CLIENT_ID="tu-client-id-aqui"  ❌ INCORRECTO
```

Debes tener valores reales como:

```env
STRAVA_CLIENT_ID="12345"  ✅ CORRECTO
```

### 2. Obtén tus credenciales reales de Strava

1. Ve a: https://www.strava.com/settings/api
2. Inicia sesión con tu cuenta de Strava
3. Busca tu aplicación (o crea una nueva)
4. Copia el **Client ID** (es un número, ej: `12345`)
5. Copia el **Client Secret** (es una cadena larga)

### 3. Actualiza tu archivo .env

Abre el archivo `.env` y reemplaza los valores:

```env
# Reemplaza estos valores con los REALES de tu aplicación Strava
STRAVA_CLIENT_ID="12345"  # Tu Client ID real (sin comillas si es número)
STRAVA_CLIENT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"  # Tu Client Secret real
NEXT_PUBLIC_STRAVA_CLIENT_ID="12345"  # Mismo que STRAVA_CLIENT_ID
```

**Importante:**

- El `Client ID` es un número (puedes ponerlo con o sin comillas)
- El `Client Secret` es una cadena larga (debe ir entre comillas)
- `NEXT_PUBLIC_STRAVA_CLIENT_ID` debe tener el mismo valor que `STRAVA_CLIENT_ID`

### 4. Reinicia el servidor

Después de actualizar el `.env`, **debes reiniciar el servidor** para que los cambios surtan efecto:

```bash
# Detén el servidor (Ctrl+C) y vuelve a iniciarlo
npm run dev
```

### 5. Verifica la configuración

Asegúrate de que:

- ✅ No hay espacios extra antes o después de los valores
- ✅ Las comillas están correctamente cerradas
- ✅ No hay caracteres especiales o espacios dentro de los valores
- ✅ El Client ID y Client Secret son los correctos de tu aplicación Strava

## Ejemplo de archivo .env correcto

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-generado"

# Strava OAuth - VALORES REALES
STRAVA_CLIENT_ID="12345"
STRAVA_CLIENT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0"
NEXT_PUBLIC_STRAVA_CLIENT_ID="12345"
```

## Verificación

Para verificar que los valores están correctos:

1. Asegúrate de que el `Client ID` en tu `.env` coincide exactamente con el que ves en https://www.strava.com/settings/api
2. Asegúrate de que el `Client Secret` es el correcto (solo se muestra una vez al crear la app)
3. Si perdiste el `Client Secret`, necesitarás crear una nueva aplicación en Strava

## Si sigues teniendo problemas

1. Verifica que la aplicación existe en Strava: https://www.strava.com/settings/api
2. Verifica que la URL de redirección en Strava sea: `http://localhost:3000/api/strava/callback`
3. Asegúrate de haber reiniciado el servidor después de cambiar el `.env`
