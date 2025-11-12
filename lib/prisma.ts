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

// Crear Prisma Client
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

// Función para desconectar Prisma (útil para limpiar conexiones)
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Función para reconectar Prisma
export async function reconnectPrisma() {
  await prisma.$connect();
}
