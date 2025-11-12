import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStravaAuthUrl, getTestStravaCredentials } from "@/lib/strava-auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

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
    // Si hay un dominio público configurado (para túnel), usarlo; si no, usar el de la request
    const publicDomain = process.env.PUBLIC_DOMAIN; // Ej: https://random-name.loca.lt
    let redirectUri: string;
    
    if (publicDomain) {
      // Usar dominio público del túnel
      redirectUri = `${publicDomain}/api/strava/callback`;
    } else {
      // Usar dominio de la request actual
      const url = new URL(request.url);
      const protocol = url.protocol; // http: o https:
      const host = url.host; // localhost:3000 o tu-dominio.com
      redirectUri = `${protocol}//${host}/api/strava/callback`;
    }

    console.log("=== DEBUG STRAVA AUTH ===");
    console.log("Client ID usado:", clientId);
    console.log("Redirect URI completo:", redirectUri);
    console.log("Public Domain configurado:", publicDomain || "No (usando request URL)");
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
