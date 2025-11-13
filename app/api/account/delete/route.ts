import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * Ruta API para eliminar la cuenta del usuario
 * Elimina todos los datos relacionados:
 * - User (y por cascade: StravaConfig, StravaAccount, Activities)
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Eliminar el usuario (las relaciones se eliminan automáticamente por cascade)
    // Esto eliminará:
    // - StravaConfig (onDelete: Cascade)
    // - StravaAccount (onDelete: Cascade)
    // - Activities (onDelete: Cascade)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json(
      { message: "Cuenta eliminada exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar cuenta:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

