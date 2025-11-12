import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { clientId, clientSecret } = await request.json();

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID y Client Secret son requeridos" },
        { status: 400 }
      );
    }

    // Guardar o actualizar las credenciales de Strava del usuario
    await prisma.stravaConfig.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      },
      create: {
        userId: session.user.id,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      },
    });

    return NextResponse.json(
      { message: "Credenciales guardadas exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al guardar credenciales de Strava:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
