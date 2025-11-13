import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStravaAuthUrl, getTestStravaCredentials } from "@/lib/strava-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener las credenciales de Strava del usuario
    const stravaConfig = await prisma.stravaConfig.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // Usar credenciales de prueba si no hay configuración en la BD
    const testCredentials = getTestStravaCredentials();
    const clientId = stravaConfig?.clientId || testCredentials.clientId;

    // Obtener el dominio desde la request actual para construir la URL dinámicamente
    // Prioridad: NEXTAUTH_URL > PUBLIC_DOMAIN > request URL
    const nextAuthUrl = process.env.NEXTAUTH_URL; // URL base de la aplicación
    const publicDomain = process.env.PUBLIC_DOMAIN; // Para túneles locales
    let redirectUri: string;

    if (nextAuthUrl) {
      // Usar NEXTAUTH_URL si está configurada (recomendado para producción)
      const baseUrl = nextAuthUrl.endsWith("/")
        ? nextAuthUrl.slice(0, -1)
        : nextAuthUrl;
      redirectUri = `${baseUrl}/api/strava/callback`;
    } else if (publicDomain) {
      // Usar dominio público del túnel (para desarrollo con túnel)
      const domain = publicDomain.endsWith("/")
        ? publicDomain.slice(0, -1)
        : publicDomain;
      redirectUri = `${domain}/api/strava/callback`;
    } else {
      // Usar dominio de la request actual (fallback)
      const url = new URL(request.url);
      const protocol = url.protocol; // http: o https:
      const host = url.host; // localhost:3000 o tu-dominio.com
      redirectUri = `${protocol}//${host}/api/strava/callback`;
    }

    // Asegurar que el redirectUri use HTTPS en producción
    if (
      process.env.NODE_ENV === "production" &&
      redirectUri.startsWith("http://")
    ) {
      redirectUri = redirectUri.replace("http://", "https://");
    }

    console.log("=== DEBUG STRAVA AUTH ===");
    console.log("Client ID usado:", clientId);
    console.log("Redirect URI completo:", redirectUri);
    console.log("NEXTAUTH_URL configurado:", nextAuthUrl || "No");
    console.log("Public Domain configurado:", publicDomain || "No");
    console.log(
      "Origen de redirectUri:",
      nextAuthUrl
        ? "NEXTAUTH_URL"
        : publicDomain
        ? "PUBLIC_DOMAIN"
        : "Request URL"
    );
    console.log("=========================");

    const stravaAuthUrl = getStravaAuthUrl(redirectUri, clientId);

    return NextResponse.json({ authUrl: stravaAuthUrl });
  } catch (error) {
    console.error("Error al obtener URL de autorización:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
