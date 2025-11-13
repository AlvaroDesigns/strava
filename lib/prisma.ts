import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Función para validar DATABASE_URL (solo se ejecuta en runtime, no durante build)
function validateDatabaseUrl() {
  // No validar durante el build de Next.js
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "❌ DATABASE_URL no está configurada. Por favor, configura esta variable de entorno en Vercel:\n" +
        "1. Ve a tu proyecto en Vercel → Settings → Environment Variables\n" +
        "2. Agrega DATABASE_URL con el formato: postgresql://user:password@host:port/database\n" +
        "3. Si usas Vercel Postgres, ve a Storage → Create Database → Postgres y copia la URL generada"
    );
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    throw new Error(
      `❌ DATABASE_URL tiene un formato incorrecto. Debe empezar con "postgresql://" o "postgres://".\n` +
        `Valor actual: ${databaseUrl.substring(0, 20)}...\n` +
        `Formato correcto: postgresql://user:password@host:port/database`
    );
  }
}

// Crear Prisma Client con configuración mejorada
function createPrismaClient() {
  // Validar solo en runtime (no durante build)
  if (typeof window === "undefined") {
    validateDatabaseUrl();
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Inicializar conexión al cargar el módulo (solo en servidor)
if (typeof window === "undefined") {
  // Conectar de forma asíncrona sin bloquear
  prisma.$connect().catch((error) => {
    console.error("Error al conectar Prisma:", error);
  });
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
