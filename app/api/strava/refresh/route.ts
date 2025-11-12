import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTestStravaCredentials } from "@/lib/strava-auth";

/**
 * Intenta refrescar el token de Strava si existe una cuenta conectada
 * Esto evita redirecciones innecesarias a la página de autorización
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Verificar si existe una cuenta de Strava
    const stravaAccount = await prisma.stravaAccount.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    if (!stravaAccount) {
      return NextResponse.json(
        { error: "No hay cuenta de Strava conectada", needsAuth: true },
        { status: 404 }
      );
    }

    // Obtener las credenciales de Strava
    const stravaConfig = await prisma.stravaConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // Usar credenciales de prueba si no hay configuración en la BD
    const testCredentials = getTestStravaCredentials();
    const clientId = stravaConfig?.clientId || testCredentials.clientId;
    const clientSecret = stravaConfig?.clientSecret || testCredentials.clientSecret;

    // Intentar refrescar el token
    try {
      const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: stravaAccount.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        console.error("Error al refrescar token:", errorData);
        
        // Si el refresh token es inválido o ha expirado, necesitamos re-autorizar
        return NextResponse.json(
          { 
            error: "El token de refresco es inválido o ha expirado", 
            needsAuth: true 
          },
          { status: 401 }
        );
      }

      const refreshData = await refreshResponse.json();

      // Calcular nueva fecha de expiración
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);

      // Actualizar la cuenta con los nuevos tokens
      await prisma.stravaAccount.update({
        where: { id: stravaAccount.id },
        data: {
          accessToken: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          expiresAt,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Token refrescado exitosamente",
        needsAuth: false,
      });
    } catch (error) {
      console.error("Error al refrescar token:", error);
      return NextResponse.json(
        { 
          error: "Error al refrescar el token", 
          needsAuth: true 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error en refresh de Strava:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", needsAuth: true },
      { status: 500 }
    );
  }
}

