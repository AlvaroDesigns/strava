import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTestStravaCredentials } from "@/lib/strava-auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/dashboard?error=strava_connection_failed", request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard?error=no_code", request.url)
      );
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
    const clientSecret =
      stravaConfig?.clientSecret || testCredentials.clientSecret;

    // DEBUG: Verificar que las credenciales se están pasando correctamente
    console.log("=== DEBUG STRAVA CALLBACK ===");
    console.log("Client ID:", clientId);
    console.log("Client Secret completo:", clientSecret || "MISSING");
    console.log("Client Secret existe:", !!clientSecret);
    console.log("Client Secret length:", clientSecret?.length || 0);
    console.log("Code recibido:", code ? "Sí" : "No");
    console.log("Code value:", code || "N/A");
    console.log("Usando credenciales de BD:", !!stravaConfig);
    console.log("Usando credenciales de prueba:", !stravaConfig);
    console.log("=============================");

    // Intercambiar código por token
    const tokenRequest = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    };

    console.log("=== REQUEST A STRAVA ===");
    console.log("URL: https://www.strava.com/oauth/token");
    console.log("Method: POST");
    console.log("Body completo:", JSON.stringify(tokenRequest, null, 2));
    console.log("========================");

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tokenRequest),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      const statusText = tokenResponse.statusText;
      const status = tokenResponse.status;

      console.error("=== ERROR 403 STRAVA API ===");
      console.error("Status:", status);
      console.error("Status Text:", statusText);
      console.error("Error Data:", JSON.stringify(errorData, null, 2));
      console.error("Client ID usado:", clientId);
      console.error("Client Secret usado:", clientSecret);
      console.error("Code usado:", code);
      console.error(
        "Request body enviado:",
        JSON.stringify(tokenRequest, null, 2)
      );
      console.error("============================");

      throw new Error(
        `Error ${status} al obtener token de Strava: ${JSON.stringify(
          errorData
        )}`
      );
    }

    const tokenData = await tokenResponse.json();

    // Obtener información del atleta
    const athleteResponse = await fetch(
      "https://www.strava.com/api/v3/athlete",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!athleteResponse.ok) {
      throw new Error("Error al obtener información del atleta");
    }

    const athlete = await athleteResponse.json();

    // Calcular fecha de expiración (los tokens de Strava expiran en 6 horas)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 6);

    // Guardar o actualizar cuenta de Strava
    await prisma.stravaAccount.upsert({
      where: {
        userId: session.user.id,
      },
      update: {
        stravaId: athlete.id.toString(),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        profile: athlete.profile,
      },
      create: {
        userId: session.user.id,
        stravaId: athlete.id.toString(),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        profile: athlete.profile,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?success=strava_connected", request.url)
    );
  } catch (error) {
    console.error("Error en callback de Strava:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=strava_connection_failed", request.url)
    );
  }
}
