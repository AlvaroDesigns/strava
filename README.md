# Strava App

Aplicación Next.js con integración de Strava, autenticación y base de datos.

## Características

- ✅ Autenticación con NextAuth
- ✅ Registro e inicio de sesión
- ✅ **Conexión automática con Strava** - Los usuarios se conectan automáticamente con Strava al hacer login
- ✅ Integración con Strava OAuth
- ✅ Sincronización de actividades de Strava
- ✅ UI moderna con shadcn/ui
- ✅ Base de datos con Prisma (PostgreSQL)

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y completa las variables:

```bash
cp .env.example .env
```

Variables necesarias:
- `DATABASE_URL`: URL de la base de datos PostgreSQL (ej: `postgresql://user:password@host:port/database`)
- `NEXTAUTH_SECRET`: Genera uno con `openssl rand -base64 32`
- `STRAVA_CLIENT_ID`: ID de tu aplicación Strava
- `STRAVA_CLIENT_SECRET`: Secret de tu aplicación Strava
- `NEXT_PUBLIC_STRAVA_CLIENT_ID`: Mismo que STRAVA_CLIENT_ID (para el cliente)

### 3. Configurar Strava OAuth

1. Ve a https://www.strava.com/settings/api
2. Crea una nueva aplicación
3. Configura la URL de redirección: `http://localhost:3000/api/strava/callback`
4. Copia el Client ID y Client Secret a tu archivo `.env`

**Nota**: La aplicación redirige automáticamente a los usuarios a Strava para autorizar cuando hacen login por primera vez. Los datos de Strava se guardan automáticamente en la base de datos.

### 4. Inicializar la base de datos

```bash
npm run db:push
```

### 5. Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Estructura del Proyecto

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth endpoints
│   │   ├── register/            # Registro de usuarios
│   │   └── strava/callback/     # Callback de Strava OAuth
│   ├── dashboard/                # Dashboard principal
│   ├── login/                    # Página de login
│   ├── register/                 # Página de registro
│   └── strava/activities/        # Lista de actividades
├── components/
│   ├── ui/                       # Componentes shadcn/ui
│   ├── strava-connect.tsx        # Botón de conexión Strava
│   └── activities-list.tsx       # Lista de actividades
├── lib/
│   ├── auth.ts                   # Configuración NextAuth
│   ├── prisma.ts                 # Cliente Prisma
│   └── utils.ts                  # Utilidades
└── prisma/
    └── schema.prisma             # Esquema de base de datos
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run db:push` - Sincroniza el esquema con la base de datos
- `npm run db:studio` - Abre Prisma Studio
- `npm run db:generate` - Genera el cliente Prisma

## Despliegue en Vercel

### Prerrequisitos

1. Cuenta en [GitHub](https://github.com)
2. Cuenta en [Vercel](https://vercel.com)
3. Base de datos PostgreSQL (Vercel Postgres, Supabase, Railway, etc.)
4. Aplicación configurada en [Strava API](https://www.strava.com/settings/api)

### Pasos para Desplegar

#### 1. Subir el código a GitHub

```bash
# Inicializar repositorio Git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit inicial
git commit -m "Initial commit"

# Crear un repositorio en GitHub y luego conectar
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
git branch -M main
git push -u origin main
```

#### 2. Configurar Base de Datos

Opciones recomendadas:
- **Vercel Postgres**: Integración nativa con Vercel
- **Supabase**: PostgreSQL gratuito con buen plan gratuito
- **Railway**: Fácil de configurar

Copia la URL de conexión de tu base de datos PostgreSQL.

#### 3. Configurar Strava OAuth para Producción

1. Ve a https://www.strava.com/settings/api
2. Edita tu aplicación existente o crea una nueva
3. Actualiza la **Authorization Callback Domain** con tu dominio de Vercel:
   - Ejemplo: `tu-app.vercel.app` (sin http://)
4. Actualiza la **Website** con tu URL de producción
5. Guarda los cambios

#### 4. Desplegar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno:

   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_URL=https://tu-app.vercel.app
   NEXTAUTH_SECRET=tu-secret-generado
   STRAVA_CLIENT_ID=tu-client-id
   STRAVA_CLIENT_SECRET=tu-client-secret
   NEXT_PUBLIC_STRAVA_CLIENT_ID=tu-client-id
   SYNC_SECRET_TOKEN=tu-token-secreto (opcional)
   ```

5. En **Build Command**, asegúrate de que esté:
   ```
   npm run build
   ```

6. En **Install Command**, asegúrate de que esté:
   ```
   npm install
   ```

7. Haz clic en **Deploy**

#### 5. Ejecutar Migraciones de Base de Datos

Después del despliegue, necesitas ejecutar las migraciones de Prisma:

**Opción A: Desde tu máquina local**
```bash
# Configura DATABASE_URL en tu .env local con la URL de producción
DATABASE_URL="postgresql://..." npm run db:push
```

**Opción B: Usando Vercel CLI**
```bash
# Instala Vercel CLI
npm i -g vercel

# Ejecuta el comando de migración
vercel env pull .env.local
DATABASE_URL="..." npx prisma db push
```

#### 6. Verificar el Despliegue

1. Visita tu URL de Vercel (ej: `https://tu-app.vercel.app`)
2. Prueba el registro y login
3. Verifica la conexión con Strava

### Variables de Entorno en Vercel

Asegúrate de configurar todas estas variables en el dashboard de Vercel:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | URL de tu aplicación en producción | `https://tu-app.vercel.app` |
| `NEXTAUTH_SECRET` | Secret para NextAuth | Genera con `openssl rand -base64 32` |
| `STRAVA_CLIENT_ID` | Client ID de Strava | Tu Client ID |
| `STRAVA_CLIENT_SECRET` | Client Secret de Strava | Tu Client Secret |
| `NEXT_PUBLIC_STRAVA_CLIENT_ID` | Client ID público | Mismo que STRAVA_CLIENT_ID |
| `SYNC_SECRET_TOKEN` | Token para sincronización (opcional) | Genera con `openssl rand -base64 32` |

### Solución de Problemas

#### Error: "Prisma Client not generated"
Agrega un script de postinstall en `package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

#### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que la base de datos permita conexiones desde Vercel
- Si usas Supabase, verifica la configuración de conexión

#### Error: "NextAuth callback URL mismatch"
- Verifica que `NEXTAUTH_URL` coincida con tu dominio de Vercel
- Actualiza la URL de callback en Strava con tu dominio de producción

Para más detalles, consulta [DEPLOY.md](./DEPLOY.md)

## Tecnologías

- **Next.js 14** - Framework React
- **TypeScript** - Tipado estático
- **Prisma** - ORM para base de datos
- **NextAuth** - Autenticación
- **shadcn/ui** - Componentes UI
- **Tailwind CSS** - Estilos
- **Strava API** - Integración con Strava

