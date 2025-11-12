import { PrismaClient } from "@prisma/client";

// Validar que DATABASE_URL esté configurada
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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Función para desconectar Prisma (útil para limpiar conexiones)
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

// Función para reconectar Prisma
export async function reconnectPrisma() {
  await prisma.$connect();
}
