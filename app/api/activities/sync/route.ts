import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveActivities, cleanOldActivities } from "@/lib/activities";
import { getTestStravaCredentials } from "@/lib/strava-auth";

/**
 * Ruta API para sincronizar actividades de Strava
 * Esta ruta obtiene las actividades de los últimos 2 meses desde la API de Strava
 * y las guarda en la base de datos, luego limpia las actividades antiguas.
 * 
 * Se puede llamar periódicamente (por ejemplo, con un cron job) para mantener
 * los datos actualizados.
 * 
 * Autenticación:
 * - Opción 1: Sesión de usuario autenticado (NextAuth)
 * - Opción 2: Token secreto en header Authorization: Bearer YOUR_SECRET_TOKEN
 * 
 * Para usar el token secreto, configura SYNC_SECRET_TOKEN en tu archivo .env
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const authHeader = request.headers.get("authorization");
    const secretToken = process.env.SYNC_SECRET_TOKEN;

    // Verificar autenticación: sesión o token secreto
    let isAuthenticated = false;

    if (session) {
      // Usuario autenticado con sesión
      isAuthenticated = true;
    } else if (authHeader && secretToken) {
      // Verificar token secreto
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (token === secretToken) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          error: "No autorizado",
          message: "Se requiere autenticación mediante sesión o token secreto (Authorization: Bearer YOUR_SECRET_TOKEN)"
        },
        { status: 401 }
      );
    }

    // Obtener todas las cuentas de Strava conectadas
    const stravaAccounts = await prisma.stravaAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    twoMonthsAgo.setHours(0, 0, 0, 0);

    let totalSynced = 0;
    const results = [];

    // Sincronizar actividades para cada cuenta
    for (const stravaAccount of stravaAccounts) {
      try {
        const stravaConfig = await prisma.stravaConfig.findUnique({
          where: {
            userId: stravaAccount.userId,
          },
        });

        // Usar credenciales de prueba si no hay configuración
        const testCredentials = getTestStravaCredentials();
        const clientId = stravaConfig?.clientId || testCredentials.clientId;
        const clientSecret = stravaConfig?.clientSecret || testCredentials.clientSecret;

        // Verificar y refrescar token si es necesario
        let accessToken = stravaAccount.accessToken;
        if (new Date() >= stravaAccount.expiresAt) {
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

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              accessToken = refreshData.access_token;

              const expiresAt = new Date();
              expiresAt.setHours(expiresAt.getHours() + 6);

              await prisma.stravaAccount.update({
                where: { id: stravaAccount.id },
                data: {
                  accessToken: refreshData.access_token,
                  refreshToken: refreshData.refresh_token,
                  expiresAt,
                },
              });
            }
          } catch (error) {
            console.error(`Error al refrescar token para usuario ${stravaAccount.userId}:`, error);
            continue;
          }
        }

        // Obtener actividades desde la API de Strava
        const after = Math.floor(twoMonthsAgo.getTime() / 1000);
        const before = Math.floor(now.getTime() / 1000);

        const response = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=200&after=${after}&before=${before}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          console.error(`Error al obtener actividades para usuario ${stravaAccount.userId}`);
          continue;
        }

        const activities = await response.json();

        // Obtener detalles completos de cada actividad
        const detailedActivities = await Promise.all(
          activities.map(async (activity: any) => {
            try {
              const detailResponse = await fetch(
                `https://www.strava.com/api/v3/activities/${activity.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );

              if (detailResponse.ok) {
                return await detailResponse.json();
              }
              return activity;
            } catch {
              return activity;
            }
          })
        );

        // Guardar actividades en la base de datos
        if (detailedActivities.length > 0) {
          await saveActivities(detailedActivities, stravaAccount.userId, stravaAccount.id);
          totalSynced += detailedActivities.length;
          results.push({
            userId: stravaAccount.userId,
            userName: stravaAccount.firstName || stravaAccount.user?.name || stravaAccount.user?.email || "Usuario",
            activitiesCount: detailedActivities.length,
          });
        }
      } catch (error) {
        console.error(`Error al sincronizar actividades para usuario ${stravaAccount.userId}:`, error);
        results.push({
          userId: stravaAccount.userId,
          error: "Error al sincronizar",
        });
      }
    }

    // Limpiar actividades antiguas (mantener solo últimos 2 meses)
    const deletedCount = await cleanOldActivities();

    return NextResponse.json({
      success: true,
      message: "Sincronización completada",
      totalSynced,
      deletedCount,
      results,
    });
  } catch (error) {
    console.error("Error en la sincronización:", error);
    return NextResponse.json(
      { error: "Error al sincronizar actividades" },
      { status: 500 }
    );
  }
}

/**
 * También permitir GET para facilitar pruebas y llamadas desde cron jobs
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

