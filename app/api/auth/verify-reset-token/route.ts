import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token es requerido" },
        { status: 400 }
      );
    }

    // Buscar el token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: "Token inválido" },
        { status: 200 }
      );
    }

    // Verificar si el token ha sido usado
    if (resetToken.used) {
      return NextResponse.json(
        { valid: false, error: "Este token ya ha sido usado" },
        { status: 200 }
      );
    }

    // Verificar si el token ha expirado
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { valid: false, error: "El token ha expirado" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      valid: true,
    });
  } catch (error) {
    console.error("Error en verify-reset-token:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

