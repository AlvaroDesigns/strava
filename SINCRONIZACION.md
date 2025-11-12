# Guía de Sincronización de Actividades

## Descripción

La aplicación sincroniza automáticamente las actividades de Strava y las guarda en la base de datos, manteniendo siempre los últimos 2 meses completos de datos. Las actividades antiguas se eliminan automáticamente.

## Sincronización Automática

La sincronización ocurre automáticamente cuando:
- Un usuario visita la página de actividades (`/strava/activities`)
- Un usuario visita el dashboard (`/dashboard`)
- Se obtienen estadísticas desde la API (`/api/activities/stats`)

## Sincronización Manual mediante API

Puedes sincronizar manualmente todas las actividades llamando a la API de sincronización.

### Configuración

1. **Genera un token secreto** (opcional, solo si quieres usar la API sin autenticación de usuario):
   ```bash
   openssl rand -base64 32
   ```

2. **Agrega el token a tu archivo `.env`**:
   ```env
   SYNC_SECRET_TOKEN="tu-token-generado-aqui"
   ```

### Uso de la API

#### Opción 1: Con Token Secreto

```bash
curl -X POST http://localhost:3000/api/activities/sync \
  -H "Authorization: Bearer tu-token-secreto"
```

#### Opción 2: Con Sesión de Usuario

Si estás autenticado en la aplicación, puedes llamar a la API sin token:

```bash
curl -X POST http://localhost:3000/api/activities/sync \
  -H "Cookie: next-auth.session-token=tu-session-token"
```

#### Opción 3: Método GET

También puedes usar GET para facilitar las pruebas:

```bash
curl -X GET http://localhost:3000/api/activities/sync \
  -H "Authorization: Bearer tu-token-secreto"
```

### Respuesta de la API

La API devuelve un JSON con el resultado de la sincronización:

```json
{
  "success": true,
  "message": "Sincronización completada",
  "totalSynced": 45,
  "deletedCount": 12,
  "results": [
    {
      "userId": "user-id-1",
      "userName": "Juan Pérez",
      "activitiesCount": 25
    },
    {
      "userId": "user-id-2",
      "userName": "María García",
      "activitiesCount": 20
    }
  ]
}
```

## Configurar Sincronización Automática con Cron

Para sincronizar automáticamente en intervalos regulares, puedes configurar un cron job:

### Ejemplo: Sincronizar cada hora

```bash
# Editar crontab
crontab -e

# Agregar esta línea (reemplaza con tu token y dominio)
0 * * * * curl -X POST https://tu-dominio.com/api/activities/sync -H "Authorization: Bearer tu-token-secreto" > /dev/null 2>&1
```

### Ejemplo: Sincronizar cada 6 horas

```bash
0 */6 * * * curl -X POST https://tu-dominio.com/api/activities/sync -H "Authorization: Bearer tu-token-secreto" > /dev/null 2>&1
```

### Ejemplo: Sincronizar diariamente a las 2 AM

```bash
0 2 * * * curl -X POST https://tu-dominio.com/api/activities/sync -H "Authorization: Bearer tu-token-secreto" > /dev/null 2>&1
```

## Servicios de Cron Online

Si no tienes acceso a un servidor con cron, puedes usar servicios gratuitos como:

- **Cron-job.org**: https://cron-job.org
- **EasyCron**: https://www.easycron.com
- **Vercel Cron** (si usas Vercel): Configura en `vercel.json`

### Ejemplo con Vercel Cron

Crea un archivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/activities/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

Y en tu ruta de sincronización, verifica el header `x-vercel-cron`:

```typescript
// En app/api/activities/sync/route.ts
const cronSecret = request.headers.get("x-vercel-cron");
if (cronSecret === process.env.CRON_SECRET) {
  // Ejecutar sincronización
}
```

## Rotación de Datos

La aplicación mantiene automáticamente solo los últimos 2 meses de actividades:

- **Almacenamiento**: Se guardan todas las actividades de los últimos 2 meses
- **Limpieza automática**: Las actividades más antiguas se eliminan automáticamente
- **Ejemplo**: Si hoy es 1 de marzo, se mantienen actividades desde el 1 de enero hasta hoy

La limpieza se ejecuta automáticamente cada vez que se sincronizan nuevas actividades.

## Solución de Problemas

### Error 401: No autorizado

- Verifica que el token secreto esté configurado en `.env`
- Verifica que el header `Authorization` tenga el formato correcto: `Bearer tu-token`
- Asegúrate de que no haya espacios extra en el token

### No se sincronizan actividades

- Verifica que las cuentas de Strava estén conectadas
- Verifica que los tokens de acceso no hayan expirado
- Revisa los logs del servidor para ver errores específicos

### Actividades no se eliminan

- La limpieza solo se ejecuta cuando hay nuevas actividades
- Verifica que la fecha de las actividades sea correcta
- Las actividades se eliminan si son anteriores a 2 meses desde hoy

