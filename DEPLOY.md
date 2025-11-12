# Guía Completa de Despliegue en Vercel

Esta guía te ayudará a desplegar tu aplicación Strava en Vercel paso a paso.

## 📋 Tabla de Contenidos

1. [Prerrequisitos](#prerrequisitos)
2. [Preparar el Proyecto](#preparar-el-proyecto)
3. [Configurar GitHub](#configurar-github)
4. [Configurar Base de Datos](#configurar-base-de-datos)
5. [Configurar Strava OAuth](#configurar-strava-oauth)
6. [Desplegar en Vercel](#desplegar-en-vercel)
7. [Configurar Variables de Entorno](#configurar-variables-de-entorno)
8. [Ejecutar Migraciones](#ejecutar-migraciones)
9. [Solución de Problemas](#solución-de-problemas)

## Prerrequisitos

Antes de comenzar, asegúrate de tener:

- ✅ Cuenta en [GitHub](https://github.com)
- ✅ Cuenta en [Vercel](https://vercel.com) (puedes usar tu cuenta de GitHub)
- ✅ Base de datos PostgreSQL configurada
- ✅ Aplicación creada en [Strava API](https://www.strava.com/settings/api)

## Preparar el Proyecto

### 1. Verificar que el proyecto compile

```bash
npm run build
```

Si hay errores, corrígelos antes de continuar.

### 2. Asegurar que Prisma esté configurado

Verifica que `prisma/schema.prisma` esté correcto y que puedas generar el cliente:

```bash
npm run db:generate
```

### 3. Agregar script postinstall (recomendado)

Abre `package.json` y agrega un script `postinstall` para generar Prisma Client automáticamente:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

## Configurar GitHub

### 1. Inicializar Git (si no está inicializado)

```bash
git init
```

### 2. Verificar .gitignore

Asegúrate de que `.gitignore` incluya:
- `.env`
- `.env.local`
- `node_modules/`
- `.next/`
- `.vercel/`

### 3. Hacer commit inicial

```bash
git add .
git commit -m "Initial commit: Strava app ready for deployment"
```

### 4. Crear repositorio en GitHub

1. Ve a [GitHub](https://github.com/new)
2. Crea un nuevo repositorio (público o privado)
3. **NO** inicialices con README, .gitignore o licencia (ya los tienes)

### 5. Conectar y subir código

```bash
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git branch -M main
git push -u origin main
```

## Configurar Base de Datos

Necesitas una base de datos PostgreSQL. Aquí tienes opciones:

### Opción 1: Vercel Postgres (Recomendado)

1. Ve a tu proyecto en Vercel
2. Ve a la pestaña **Storage**
3. Haz clic en **Create Database** → **Postgres**
4. Selecciona un plan (hay un plan gratuito)
5. Copia la `DATABASE_URL` que se genera automáticamente

### Opción 2: Supabase

1. Ve a [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **Settings** → **Database**
4. Copia la **Connection String** (URI)
5. Formato: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

### Opción 3: Railway

1. Ve a [Railway](https://railway.app)
2. Crea un nuevo proyecto
3. Agrega una base de datos PostgreSQL
4. Copia la `DATABASE_URL` de las variables de entorno

## Configurar Strava OAuth

### 1. Actualizar aplicación en Strava

1. Ve a https://www.strava.com/settings/api
2. Edita tu aplicación existente o crea una nueva
3. Configura:
   - **Website**: `https://tu-app.vercel.app`
   - **Authorization Callback Domain**: `tu-app.vercel.app` (sin https://)
4. Guarda los cambios

### 2. Obtener credenciales

Anota:
- **Client ID**
- **Client Secret**

Los necesitarás para las variables de entorno en Vercel.

## Desplegar en Vercel

### 1. Conectar con GitHub

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New Project"**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Selecciona tu repositorio

### 2. Configurar el proyecto

Vercel detectará automáticamente que es un proyecto Next.js. Verifica:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (raíz del proyecto)
- **Build Command**: `npm run build` (o `next build`)
- **Output Directory**: `.next` (automático)
- **Install Command**: `npm install`

### 3. Configurar Variables de Entorno

Antes de hacer deploy, configura las variables de entorno en Vercel:

1. En la sección **Environment Variables**, agrega:

```
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_URL=https://tu-app.vercel.app
NEXTAUTH_SECRET=tu-secret-generado-con-openssl-rand-base64-32
STRAVA_CLIENT_ID=tu-client-id
STRAVA_CLIENT_SECRET=tu-client-secret
NEXT_PUBLIC_STRAVA_CLIENT_ID=tu-client-id
SYNC_SECRET_TOKEN=tu-token-secreto (opcional)
```

2. **Importante**: 
   - `NEXTAUTH_URL` debe ser la URL de producción (se actualizará después del primer deploy)
   - Genera `NEXTAUTH_SECRET` con: `openssl rand -base64 32`
   - `NEXT_PUBLIC_STRAVA_CLIENT_ID` debe ser igual a `STRAVA_CLIENT_ID`

### 4. Hacer Deploy

1. Haz clic en **Deploy**
2. Espera a que termine el build (puede tardar unos minutos)
3. Una vez completado, obtendrás una URL como: `https://tu-app.vercel.app`

### 5. Actualizar NEXTAUTH_URL

Después del primer deploy:

1. Ve a **Settings** → **Environment Variables**
2. Actualiza `NEXTAUTH_URL` con tu URL real de Vercel
3. Haz un nuevo deploy (Vercel lo hará automáticamente si tienes auto-deploy activado)

## Ejecutar Migraciones

Después del despliegue, necesitas crear las tablas en tu base de datos:

### Opción 1: Desde tu máquina local

```bash
# Configura DATABASE_URL temporalmente
export DATABASE_URL="postgresql://user:password@host:port/database"

# Ejecuta las migraciones
npm run db:push
```

### Opción 2: Usando Vercel CLI

```bash
# Instala Vercel CLI
npm i -g vercel

# Login en Vercel
vercel login

# Descarga las variables de entorno
vercel env pull .env.local

# Ejecuta las migraciones
npx prisma db push
```

### Opción 3: Script de build en Vercel

Puedes agregar un script que ejecute las migraciones durante el build:

1. Crea un script `scripts/migrate.sh`:
```bash
#!/bin/bash
npx prisma db push --skip-generate
```

2. Actualiza `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && prisma db push --skip-generate && next build"
  }
}
```

**Nota**: Esto puede hacer que el build sea más lento. La Opción 1 o 2 son preferibles.

## Solución de Problemas

### Error: "Prisma Client not generated"

**Solución**: Agrega un script `postinstall` en `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

### Error: "Database connection failed"

**Posibles causas**:
1. `DATABASE_URL` incorrecta o no configurada
2. La base de datos no permite conexiones externas
3. Firewall bloqueando conexiones

**Solución**:
- Verifica que `DATABASE_URL` esté correctamente configurada en Vercel
- Si usas Supabase, verifica que la conexión esté en modo "Connection Pooling" o "Direct"
- Verifica que la base de datos permita conexiones desde cualquier IP (0.0.0.0/0)

### Error: "NextAuth callback URL mismatch"

**Solución**:
1. Verifica que `NEXTAUTH_URL` en Vercel coincida exactamente con tu dominio
2. Actualiza la URL de callback en Strava con tu dominio de producción
3. Asegúrate de que no haya espacios o caracteres especiales

### Error: "Module not found" o errores de build

**Solución**:
1. Verifica que todas las dependencias estén en `package.json`
2. Ejecuta `npm install` localmente y verifica que no haya errores
3. Verifica que `node_modules` esté en `.gitignore`

### Error: "Environment variable not found"

**Solución**:
1. Verifica que todas las variables de entorno estén configuradas en Vercel
2. Asegúrate de que las variables estén disponibles para el entorno correcto (Production, Preview, Development)
3. Las variables que empiezan con `NEXT_PUBLIC_` deben estar configuradas

### Build exitoso pero la app no funciona

**Solución**:
1. Revisa los logs en Vercel Dashboard → Deployments → [Tu deploy] → Logs
2. Verifica que las variables de entorno estén correctamente configuradas
3. Prueba acceder a `/api/health` o cualquier endpoint para ver errores

## Verificar el Despliegue

Después de completar todos los pasos:

1. ✅ Visita tu URL de Vercel
2. ✅ Prueba el registro de un nuevo usuario
3. ✅ Prueba el login
4. ✅ Verifica la conexión con Strava
5. ✅ Verifica que las actividades se sincronicen

## Actualizaciones Futuras

Para actualizar tu aplicación:

```bash
# Hacer cambios en tu código
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

Vercel detectará automáticamente los cambios y hará un nuevo deploy.

## Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)
- [Documentación de NextAuth](https://next-auth.js.org/getting-started/introduction)
- [Strava API Documentation](https://developers.strava.com/)

