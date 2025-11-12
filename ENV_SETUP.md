# Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui-genera-uno-con-openssl-rand-base64-32"

# Strava OAuth
STRAVA_CLIENT_ID="tu-strava-client-id"
STRAVA_CLIENT_SECRET="tu-strava-client-secret"
NEXT_PUBLIC_STRAVA_CLIENT_ID="tu-strava-client-id"

# Sincronización de Actividades (Opcional)
# Token secreto para autenticar llamadas a la API de sincronización
# Genera uno con: openssl rand -base64 32
SYNC_SECRET_TOKEN="tu-token-secreto-para-sincronizacion"
```

## Generar Secrets

Ejecuta este comando para generar secrets seguros:

```bash
# Para NEXTAUTH_SECRET
openssl rand -base64 32

# Para SYNC_SECRET_TOKEN (si quieres usar sincronización automática)
openssl rand -base64 32
```

## Obtener Credenciales de Strava

1. Ve a https://www.strava.com/settings/api
2. Haz clic en "Create New App"
3. Completa el formulario:
   - **Application Name**: El nombre de tu aplicación
   - **Category**: Selecciona una categoría
   - **Website**: http://localhost:3000
   - **Authorization Callback Domain**: localhost:3000
4. Copia el **Client ID** y **Client Secret**
5. Configura la URL de redirección en Strava: `http://localhost:3000/api/strava/callback`

## Sincronización Automática de Actividades

La aplicación guarda automáticamente las actividades de Strava en la base de datos y mantiene solo los últimos 2 meses de datos.

### Configurar Token Secreto para Sincronización

Si quieres sincronizar actividades mediante llamadas API externas (por ejemplo, con un cron job), configura el token secreto:

1. Genera un token seguro:
   ```bash
   openssl rand -base64 32
   ```

2. Agrega el token a tu archivo `.env`:
   ```env
   SYNC_SECRET_TOKEN="tu-token-generado-aqui"
   ```

3. Usa el token en las llamadas a la API de sincronización:
   ```bash
   curl -X POST http://localhost:3000/api/activities/sync \
     -H "Authorization: Bearer tu-token-generado-aqui"
   ```

### Ejemplo de Cron Job

Para sincronizar automáticamente cada hora, puedes configurar un cron job:

```bash
# Editar crontab
crontab -e

# Agregar esta línea para sincronizar cada hora
0 * * * * curl -X POST https://tu-dominio.com/api/activities/sync -H "Authorization: Bearer tu-token-secreto"
```

**Nota**: La sincronización también funciona si estás autenticado con una sesión de usuario. El token secreto es opcional y solo necesario para llamadas automatizadas.

