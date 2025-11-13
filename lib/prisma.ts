import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Función para validar DATABASE_URL (solo se ejecuta en runtime, no durante build)
function validateDatabaseUrl(): boolean {
  // No validar durante el build de Next.js
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test"
  ) {
    return false;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      "⚠️ DATABASE_URL no está configurada. La aplicación puede no funcionar correctamente.\n" +
        "Por favor, configura esta variable de entorno:\n" +
        "1. Ve a tu proyecto en Vercel → Settings → Environment Variables\n" +
        "2. Agrega DATABASE_URL con el formato: postgresql://user:password@host:port/database\n" +
        "3. Si usas Vercel Postgres, ve a Storage → Create Database → Postgres y copia la URL generada"
    );
    return false;
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    console.error(
      `❌ DATABASE_URL tiene un formato incorrecto. Debe empezar con "postgresql://" o "postgres://".\n` +
        `Valor actual: ${databaseUrl.substring(0, 20)}...\n` +
        `Formato correcto: postgresql://user:password@host:port/database`
    );
    return false;
  }

  return true;
}

// Crear Prisma Client con configuración mejorada
function createPrismaClient() {
  // Durante el build, usar una URL temporal para evitar errores de validación
  // Prisma validará la URL al crear el cliente, así que necesitamos una URL válida
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test";

  let databaseUrl = process.env.DATABASE_URL;

  // Si estamos en fase de build y no hay DATABASE_URL, usar una URL temporal
  if (isBuildPhase && !databaseUrl) {
    databaseUrl = "postgresql://user:password@localhost:5432/database";
  }

  // Si DATABASE_URL no tiene el formato correcto, usar una URL temporal durante build
  if (
    isBuildPhase &&
    databaseUrl &&
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    databaseUrl = "postgresql://user:password@localhost:5432/database";
  }

  // Configurar la URL temporalmente si es necesario
  if (
    isBuildPhase &&
    databaseUrl === "postgresql://user:password@localhost:5432/database"
  ) {
    process.env.DATABASE_URL = databaseUrl;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Inicializar conexión al cargar el módulo (solo en servidor y solo si DATABASE_URL está configurada)
if (typeof window === "undefined") {
  // Validar antes de intentar conectar
  const isValid = validateDatabaseUrl();
  if (isValid) {
    // Conectar de forma asíncrona sin bloquear
    prisma.$connect().catch((error) => {
      // Solo loguear el error, no lanzarlo (para no romper el build)
      if (
        error?.message?.includes("must start with the protocol") ||
        error?.message?.includes("DATABASE_URL")
      ) {
        console.warn(
          "⚠️ No se pudo conectar a la base de datos. Asegúrate de que DATABASE_URL esté configurada correctamente."
        );
      } else {
        console.error("Error al conectar Prisma:", error);
      }
    });
  }
}

// Función para verificar y reconectar si es necesario
async function ensureConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    // Si la conexión está cerrada, reconectar
    if (error?.code === "P1001" || error?.message?.includes("Closed")) {
      console.warn("Conexión cerrada, reconectando...");
      try {
        await prisma.$disconnect();
      } catch {
        // Ignorar errores al desconectar
      }
      await prisma.$connect();
    } else {
      throw error;
    }
  }
}

// Función para desconectar Prisma (útil para limpiar conexiones)
export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error al desconectar Prisma:", error);
  }
}

// Función para reconectar Prisma
export async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch {
    // Ignorar errores al desconectar
  }
  await prisma.$connect();
}

// Wrapper para operaciones de Prisma con reconexión automática
export async function withPrisma<T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    return await operation(prisma);
  } catch (error: any) {
    // Si la conexión está cerrada, intentar reconectar y reintentar
    if (
      error?.code === "P1001" ||
      error?.message?.includes("Closed") ||
      error?.message?.includes("connection")
    ) {
      console.warn("Error de conexión detectado, reconectando...");
      await ensureConnection();
      // Reintentar la operación una vez
      return await operation(prisma);
    }
    throw error;
  }
}
