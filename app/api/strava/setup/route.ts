import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError);
      return NextResponse.json(
        { error: "El cuerpo de la solicitud no es válido JSON" },
        { status: 400 }
      );
    }

    const { clientId, clientSecret } = body;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Client ID y Client Secret son requeridos" },
        { status: 400 }
      );
    }

    console.log("=== DEBUG STRAVA SETUP ===");
    console.log("User ID:", session.user.id);
    console.log(
      "Client ID recibido:",
      clientId ? `${clientId.substring(0, 5)}...` : "No"
    );
    console.log("Client Secret recibido:", clientSecret ? "Sí (oculto)" : "No");
    console.log("==========================");

    // Verificar que el usuario existe en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      console.error(
        "⚠️ Usuario no encontrado en la base de datos:",
        session.user.id,
        "Email de sesión:",
        session.user.email
      );
      console.error(
        "💡 Esto puede pasar si el usuario fue eliminado pero la sesión sigue activa."
      );
      return NextResponse.json(
        {
          error:
            "Tu sesión no es válida. El usuario no existe en la base de datos. Por favor, cierra sesión e inicia sesión nuevamente, o regístrate si es tu primera vez.",
          code: "USER_NOT_FOUND",
          shouldLogout: true,
        },
        { status: 401 }
      );
    }

    // Guardar o actualizar las credenciales de Strava del usuario
    try {
      const result = await prisma.stravaConfig.upsert({
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

      console.log("✓ Credenciales guardadas exitosamente");

      return NextResponse.json(
        { message: "Credenciales guardadas exitosamente" },
        { status: 200 }
      );
    } catch (dbError: any) {
      console.error("Error de base de datos:", {
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
      });

      if (dbError?.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una configuración para este usuario" },
          { status: 400 }
        );
      }

      if (dbError?.code === "P2003") {
        console.error(
          "Error de foreign key - Usuario no existe:",
          session.user.id
        );
        return NextResponse.json(
          {
            error:
              "Usuario no encontrado en la base de datos. Por favor, inicia sesión nuevamente.",
          },
          { status: 404 }
        );
      }

      if (
        dbError?.code === "P1001" ||
        dbError?.message?.includes("connection")
      ) {
        return NextResponse.json(
          {
            error:
              "Error de conexión a la base de datos. Por favor, intenta de nuevo.",
          },
          { status: 503 }
        );
      }

      throw dbError; // Re-lanzar para que se capture en el catch general
    }
  } catch (error: any) {
    console.error("Error al guardar credenciales de Strava:", {
      message: error?.message,
      code: error?.code,
      stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
    });

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
