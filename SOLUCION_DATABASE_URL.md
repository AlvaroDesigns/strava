# Solución: Error DATABASE_URL en Vercel

## 🔴 Error Actual

```
Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`
```

Este error significa que la variable `DATABASE_URL` **no está configurada** o tiene un **formato incorrecto** en Vercel.

## ✅ Solución Paso a Paso

### Paso 1: Crear Base de Datos PostgreSQL

Tienes dos opciones:

#### Opción A: Vercel Postgres (Recomendado - Más Fácil)

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `strava`
3. Ve a la pestaña **"Storage"** (en el menú lateral)
4. Haz clic en **"Create Database"**
5. Selecciona **"Postgres"**
6. Elige un plan (hay uno gratuito disponible)
7. Espera a que se cree la base de datos
8. **Copia la `DATABASE_URL`** que aparece automáticamente (formato: `postgresql://...`)

#### Opción B: Supabase (Alternativa)

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. Ve a **Settings** → **Database**
5. En la sección **Connection String**, copia la **URI** (formato: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`)

### Paso 2: Configurar DATABASE_URL en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto `strava`
3. Ve a **Settings** → **Environment Variables**
4. Haz clic en **"Add New"**
5. Configura:
   - **Key**: `DATABASE_URL`
   - **Value**: Pega la URL que copiaste (debe empezar con `postgresql://` o `postgres://`)
   - **Environments**: Selecciona todas (Production, Preview, Development)
6. Haz clic en **"Save"**

### Paso 3: Verificar el Formato

La `DATABASE_URL` debe tener este formato:

```
postgresql://usuario:contraseña@host:5432/nombre_base_datos
```

**Ejemplos válidos:**
- `postgresql://default:password123@host.vercel-storage.com:5432/verceldb`
- `postgresql://postgres:mi_password@db.xxxxx.supabase.co:5432/postgres`

**❌ Formatos incorrectos:**
- `postgres://...` (sin el `ql`)
- `https://...` (no es una URL HTTP)
- `localhost:5432` (falta el protocolo)
- Vacío o sin valor

### Paso 4: Ejecutar Migraciones

Después de configurar `DATABASE_URL`, necesitas crear las tablas en la base de datos:

#### Opción 1: Desde tu máquina local (Recomendado)

```bash
# Configura temporalmente la DATABASE_URL de producción
export DATABASE_URL="postgresql://tu-url-completa-aqui"

# Ejecuta las migraciones para crear las tablas
npx prisma db push
```

#### Opción 2: Usando Vercel CLI

```bash
# Instala Vercel CLI si no lo tienes
npm i -g vercel

# Login en Vercel
vercel login

# Descarga las variables de entorno
vercel env pull .env.local

# Ejecuta las migraciones
npx prisma db push
```

### Paso 5: Hacer un Nuevo Deploy

1. En Vercel, ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **"Redeploy"**
4. O simplemente haz un nuevo commit y push a GitHub (si tienes auto-deploy activado)

## 🔍 Verificar que Funciona

1. Después del deploy, visita tu aplicación
2. Intenta hacer login o registro
3. Si no aparece el error de `DATABASE_URL`, ¡está funcionando!

## ❓ Problemas Comunes

### Error: "DATABASE_URL no está configurada"

**Solución**: Asegúrate de que:
- La variable esté agregada en Vercel → Settings → Environment Variables
- El nombre sea exactamente `DATABASE_URL` (sin espacios, mayúsculas correctas)
- Esté seleccionada para el entorno correcto (Production, Preview, Development)

### Error: "URL must start with postgresql://"

**Solución**: 
- Verifica que la URL copiada esté completa
- No debe tener espacios al inicio o final
- Debe empezar con `postgresql://` o `postgres://`

### Error: "Connection refused" o "Timeout"

**Solución**:
- Verifica que la base de datos esté activa
- Si usas Supabase, verifica que permita conexiones externas
- Verifica que el firewall no esté bloqueando la conexión

## 📝 Checklist

- [ ] Base de datos PostgreSQL creada (Vercel Postgres o Supabase)
- [ ] `DATABASE_URL` configurada en Vercel → Settings → Environment Variables
- [ ] Formato correcto: `postgresql://...` o `postgres://...`
- [ ] Variable disponible para Production, Preview y Development
- [ ] Migraciones ejecutadas (`npx prisma db push`)
- [ ] Nuevo deploy realizado en Vercel
- [ ] Error resuelto ✅

## 🆘 Si Aún Tienes Problemas

1. Verifica los logs en Vercel: **Deployments** → [Tu deploy] → **Logs**
2. Verifica que la variable esté configurada: **Settings** → **Environment Variables**
3. Asegúrate de que el deploy se haya completado después de agregar la variable

