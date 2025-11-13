import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Validar variables de entorno necesarias para NextAuth
// Esta validación solo se ejecuta en runtime, no durante el build
function validateNextAuthEnv() {
  // No validar durante el build de Next.js
  if (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NODE_ENV === "test"
  ) {
    return;
  }

  // Solo validar en el servidor (no en el cliente)
  if (typeof window !== "undefined") {
    return;
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!nextAuthSecret) {
    const errorMessage =
      "❌ NEXTAUTH_SECRET no está configurada. Por favor, configura esta variable de entorno en Vercel:\n" +
      "1. Ve a tu proyecto en Vercel → Settings → Environment Variables\n" +
      "2. Agrega NEXTAUTH_SECRET\n" +
      "3. Genera un valor seguro con: openssl rand -base64 32";

    console.error(errorMessage);
    // En producción, lanzar el error para que NextAuth lo capture
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMessage);
    }
  }

  if (!nextAuthUrl && process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️ NEXTAUTH_URL no está configurada. NextAuth intentará inferirla automáticamente, pero es recomendable configurarla explícitamente."
    );
  }
}

// Validar solo cuando se importa el módulo en el servidor
// Usar un try-catch para evitar que falle el build
try {
  if (typeof window === "undefined") {
    validateNextAuthEnv();
  }
} catch (error) {
  // En desarrollo, mostrar el error pero no bloquear
  if (process.env.NODE_ENV === "development") {
    console.error("Error validando variables de NextAuth:", error);
  }
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: email,
            },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error: any) {
          // Si el error es sobre DATABASE_URL, lanzar un error más claro
          if (
            error?.message?.includes("DATABASE_URL") ||
            error?.message?.includes("postgresql://") ||
            error?.message?.includes("postgres://")
          ) {
            console.error(
              "❌ Error de conexión a la base de datos:",
              error.message
            );
            throw new Error(
              "Error de configuración de base de datos. Por favor, verifica que DATABASE_URL esté configurada correctamente en Vercel."
            );
          }
          console.error("Error en authorize:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Crear instancia única de NextAuth para NextAuth v5
const nextAuthInstance = NextAuth(authOptions);

// Exportar auth() para usar en componentes del servidor
export const { auth } = nextAuthInstance;

// Exportar handlers para la ruta API
export const { handlers } = nextAuthInstance;
