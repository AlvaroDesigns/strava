import { PrismaClient } from "@prisma/client";

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
