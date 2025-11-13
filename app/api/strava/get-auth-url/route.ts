import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStravaAuthUrl } from "@/lib/strava-auth";
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

    // Las credenciales deben estar en la base de datos
    if (!stravaConfig || !stravaConfig.clientId) {
      return NextResponse.json(
        {
          error:
            "Credenciales de Strava no configuradas. Por favor, configura tus credenciales de Strava en tu perfil.",
        },
        { status: 400 }
      );
    }

    const clientId = stravaConfig.clientId;

    // Prioridad para obtener redirectUri:
    // 1. STRAVA_REDIRECT_URI (variable de entorno explícita)
    // 2. NEXTAUTH_URL + /api/strava/callback
    // 3. PUBLIC_DOMAIN + /api/strava/callback
    // 4. Request URL + /api/strava/callback
    const explicitRedirectUri = process.env.STRAVA_REDIRECT_URI;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const publicDomain = process.env.PUBLIC_DOMAIN;
    let redirectUri: string;

    // Función helper para normalizar URLs y asegurar que tengan protocolo
    const normalizeUrl = (
      url: string,
      defaultProtocol: string = "https"
    ): string => {
      // Si ya tiene protocolo, usarlo
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url.endsWith("/") ? url.slice(0, -1) : url;
      }
      // Si no tiene protocolo, agregarlo
      const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
      return `${defaultProtocol}://${cleanUrl}`;
    };

    // Si hay un redirect_uri explícito configurado, usarlo directamente
    if (explicitRedirectUri) {
      redirectUri = explicitRedirectUri.trim();
      // Asegurar que tenga protocolo
      if (
        !redirectUri.startsWith("http://") &&
        !redirectUri.startsWith("https://")
      ) {
        redirectUri = `https://${redirectUri}`;
      }
    } else if (nextAuthUrl) {
      // Usar NEXTAUTH_URL si está configurada (recomendado para producción)
      const baseUrl = normalizeUrl(nextAuthUrl, "https");
      redirectUri = `${baseUrl}/api/strava/callback`;
    } else if (publicDomain) {
      // Usar dominio público del túnel (para desarrollo con túnel)
      const domain = normalizeUrl(publicDomain, "https");
      redirectUri = `${domain}/api/strava/callback`;
    } else {
      // Usar dominio de la request actual (fallback)
      const url = new URL(request.url);
      const protocol = url.protocol; // http: o https:
      const host = url.host; // localhost:3000 o tu-dominio.com
      redirectUri = `${protocol}//${host}/api/strava/callback`;
    }

    // Asegurar que el redirectUri use HTTPS en producción
    if (process.env.NODE_ENV === "production") {
      if (redirectUri.startsWith("http://")) {
        redirectUri = redirectUri.replace("http://", "https://");
      }
      // Asegurar que siempre tenga https://
      if (
        !redirectUri.startsWith("https://") &&
        !redirectUri.startsWith("http://")
      ) {
        redirectUri = `https://${redirectUri}`;
      }
    }

    console.log("=== DEBUG STRAVA AUTH ===");
    console.log("Client ID usado:", clientId);
    console.log("Redirect URI completo:", redirectUri);
    console.log(
      "STRAVA_REDIRECT_URI configurado:",
      explicitRedirectUri || "No"
    );
    console.log("NEXTAUTH_URL configurado:", nextAuthUrl || "No");
    console.log("Public Domain configurado:", publicDomain || "No");
    console.log(
      "Origen de redirectUri:",
      explicitRedirectUri
        ? "STRAVA_REDIRECT_URI (explícito)"
        : nextAuthUrl
        ? "NEXTAUTH_URL"
        : publicDomain
        ? "PUBLIC_DOMAIN"
        : "Request URL"
    );
    console.log(
      "⚠️ IMPORTANTE: El redirect_uri debe coincidir EXACTAMENTE con lo configurado en Strava"
    );
    console.log("   Ve a https://www.strava.com/settings/api y verifica:");
    console.log(
      "   1. Authorization Callback Domain: together.gelato.alvarodesigns.com"
    );
    console.log("   2. O Redirect URI completo:", redirectUri);
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
