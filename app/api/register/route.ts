import { withPrisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es válido JSON" },
        { status: 400 }
      );
    }

    const { name, email, password } = body;

    // Validación de entrada
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe usando withPrisma para manejar reconexiones
    const existingUser = await withPrisma(async (prisma) => {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario usando withPrisma para manejar reconexiones
    const user = await withPrisma(async (prisma) => {
      return await prisma.user.create({
        data: {
          name: name?.trim() || null,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
        },
      });
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente", userId: user.id },
      { status: 201 }
    );
  } catch (error: any) {
    // Log detallado del error
    console.error("Error al registrar usuario:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });

    // Manejar errores específicos de Prisma
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "El email ya está registrado" },
        { status: 400 }
      );
    }

    if (error?.code === "P1001" || error?.message?.includes("connection")) {
      return NextResponse.json(
        {
          error:
            "Error de conexión a la base de datos. Por favor, intenta de nuevo.",
        },
        { status: 503 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        ...(process.env.NODE_ENV === "development" && {
          details: error?.message,
        }),
      },
      { status: 500 }
    );
  }
}
